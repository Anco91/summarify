import asyncio
import contextlib
import re
import uuid
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.application.transcription.use_cases import TranscribeUseCase
from src.core.config import get_settings
from src.core.logging import get_logger
from src.core.session_store import SessionState, session_store
from src.infrastructure.transcription.whisper_service import WhisperService
from src.presentation.transcription.schemas import UploadResponse

router = APIRouter(prefix="/api", tags=["transcription"])
limiter = Limiter(key_func=get_remote_address)
logger = get_logger(__name__)

# Semaphore global : limite les transcriptions simultanées (protection RAM)
_SEMAPHORE = asyncio.Semaphore(get_settings().MAX_CONCURRENT_TRANSCRIPTIONS)

_ACCEPTED_MIME = {
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/ogg",
    "audio/flac",
    "audio/x-flac",
    "audio/webm",
}


async def _run_transcription(
    session_id: str, file_path: str, language: str | None
) -> None:
    """Background task : transcrit le fichier et écrit dans le session_store."""
    use_case = TranscribeUseCase(WhisperService(), _SEMAPHORE)
    try:
        await session_store.update_status(session_id, "transcribing")
        async for text in use_case.execute(file_path, language):
            await session_store.add_segment(session_id, text)
        await session_store.mark_done(session_id)
    except Exception:
        logger.exception("transcription_bg_error", session_id=session_id)
        await session_store.mark_error(session_id, "Erreur interne de transcription")
        # Le fichier est nettoyé par TranscribeUseCase.execute() dans son finally


async def _sse_generator(state: SessionState) -> AsyncGenerator[str, None]:
    """
    Génère les événements SSE pour un client.

    Envoie d'abord les segments déjà buffés (reconnexion), puis les
    segments live via un asyncio.Queue fan-out. Supporte plusieurs
    clients connectés simultanément sur la même session.
    """
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    # Snapshot atomique avant souscription (asyncio single-thread : pas d'await
    # entre les deux lignes → aucun segment ne peut être manqué ou dupliqué)
    cursor = len(state.segments)
    state.subscribers.append(queue)

    with contextlib.suppress(Exception):
        # 1. Segments déjà buffés (replay pour reconnexion)
        for seg in state.segments[:cursor]:
            yield f"data: {seg}\n\n"

        # 2. Session terminée avant connexion → flush queue + fermer
        if state.status in ("done", "error"):
            while not queue.empty():
                item = queue.get_nowait()
                if item is not None:
                    yield f"data: {item}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 3. Segments live
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=30)
            except TimeoutError:
                yield ": keep-alive\n\n"
                continue

            if item is None:  # sentinel [DONE]
                while not queue.empty():
                    remaining = queue.get_nowait()
                    if remaining is not None:
                        yield f"data: {remaining}\n\n"
                yield "data: [DONE]\n\n"
                return

            yield f"data: {item}\n\n"

    with contextlib.suppress(ValueError):
        state.subscribers.remove(queue)


@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload d'un fichier audio",
    status_code=200,
)
@limiter.limit("5/minute")  # noqa: B008
async def upload_audio(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),  # noqa: B008
    lang: Annotated[
        str | None,
        Form(description="Code ISO 639-1 (fr, en…). Absent = auto-détection."),
    ] = None,
) -> JSONResponse:
    settings = get_settings()

    # Validation MIME côté serveur
    content_type = file.content_type or ""
    if content_type not in _ACCEPTED_MIME:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Type de fichier non supporté : {content_type}."
                " Formats acceptés : mp3, wav, m4a, ogg, flac"
            ),
        )

    content = await file.read()

    # Validation taille
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Fichier trop volumineux ({size_mb:.1f} Mo)."
                f" Limite : {settings.MAX_UPLOAD_SIZE_MB} Mo"
            ),
        )

    # Normalise lang (format ISO 639-1 : 2 lettres minuscules)
    if lang and not re.match(r"^[a-z]{2}$", lang):
        lang = None

    session_id = str(uuid.uuid4())
    path = f"/tmp/{session_id}.audio"

    with open(path, "wb") as f:
        f.write(content)

    await session_store.create(
        session_id=session_id,
        filename=file.filename or "audio",
        language=lang,
    )

    # Lance la transcription en arrière-plan (non-bloquant pour le client)
    background_tasks.add_task(_run_transcription, session_id, path, lang)

    return JSONResponse({"session_id": session_id})


@router.get("/session/{session_id}/stream", summary="Stream SSE de la transcription")
async def stream_session(
    session_id: str,
    _lang: Annotated[
        str | None,
        Query(alias="lang", description="Ignoré — la langue est fixée à l'upload."),
    ] = None,
) -> StreamingResponse:
    state = await session_store.get(session_id)
    if state is None:
        raise HTTPException(
            status_code=404,
            detail="Session introuvable ou expirée. Veuillez uploader à nouveau.",
        )

    return StreamingResponse(
        _sse_generator(state),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
