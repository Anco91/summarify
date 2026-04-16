import asyncio
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.application.transcription.use_cases import TranscribeUseCase
from src.core.config import get_settings
from src.core.job_store import job_store
from src.domain.transcription.ports import ITranscriptionPort
from src.infrastructure.transcription.whisper_service import WhisperService
from src.presentation.transcription.schemas import UploadResponse
from src.presentation.transcription.sse_formatter import SseFormatter

router = APIRouter(prefix="/api", tags=["transcription"])
limiter = Limiter(key_func=get_remote_address)

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


def get_transcription_service() -> ITranscriptionPort:
    return WhisperService()


def get_transcribe_use_case(
    service: ITranscriptionPort = Depends(get_transcription_service),  # noqa: B008
) -> TranscribeUseCase:
    return TranscribeUseCase(service, _SEMAPHORE)


@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload d'un fichier audio",
    status_code=200,
)
@limiter.limit("5/minute")
async def upload_audio(request: Request, file: UploadFile = File(...)) -> JSONResponse:  # noqa: B008
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

    job_id = str(uuid.uuid4())
    # On ignore le nom fourni par le client — UUID seul évite toute injection de path
    path = f"/tmp/{job_id}.audio"

    with open(path, "wb") as f:
        f.write(content)

    await job_store.put(job_id, path)
    return JSONResponse({"job_id": job_id})


@router.get("/stream/{job_id}", summary="Stream SSE de la transcription")
async def stream_transcription(
    job_id: str,
    lang: Annotated[
        str | None,
        Query(pattern=r"^[a-z]{2}$", description="Code ISO 639-1 (fr, en, de…)"),
    ] = None,
    use_case: TranscribeUseCase = Depends(get_transcribe_use_case),  # noqa: B008
) -> StreamingResponse:
    file_path = await job_store.pop(job_id)
    if file_path is None:
        raise HTTPException(status_code=404, detail="Job introuvable ou expiré")

    return StreamingResponse(
        SseFormatter.format(use_case.execute(file_path, language=lang)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
