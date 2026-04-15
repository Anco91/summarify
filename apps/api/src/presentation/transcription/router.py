import uuid, os, asyncio
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from src.infrastructure.transcription.whisper_service import WhisperService
from src.domain.transcription.ports import ITranscriptionPort
from src.application.transcription.use_cases import TranscribeUseCase
from src.presentation.transcription.sse_formatter import SseFormatter
from src.core.config import get_settings

router = APIRouter(prefix="/api", tags=["transcription"])

# Semaphore global : limite les transcriptions simultanees (protection RAM)
_SEMAPHORE = asyncio.Semaphore(get_settings().MAX_CONCURRENT_TRANSCRIPTIONS)


def get_transcription_service() -> ITranscriptionPort:
    return WhisperService()


def get_transcribe_use_case(
    service: ITranscriptionPort = Depends(get_transcription_service),
) -> TranscribeUseCase:
    return TranscribeUseCase(service, _SEMAPHORE)


@router.post("/upload", summary="Upload d'un fichier audio")
async def upload_audio(file: UploadFile = File(...)):
    settings = get_settings()
    # Validation de la taille (evite les uploads de plusieurs Go)
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux ({size_mb:.1f} Mo). Limite : {settings.MAX_UPLOAD_SIZE_MB} Mo",
        )
    # Sauvegarde avec un nom unique pour eviter les collisions
    job_id = str(uuid.uuid4())
    safe_name = f"{job_id}_{file.filename or 'audio'}"
    path = f"/tmp/{safe_name}"
    with open(path, "wb") as f:
        f.write(content)
    return JSONResponse({"job_id": job_id})


@router.get("/stream/{job_id}", summary="Stream SSE de la transcription")
async def stream_transcription(
    job_id: str,
    use_case: TranscribeUseCase = Depends(get_transcribe_use_case),
):
    # Trouver le fichier dans /tmp par le job_id
    matches = [f for f in os.listdir("/tmp") if f.startswith(job_id)]
    if not matches:
        raise HTTPException(status_code=404, detail="Job introuvable ou expire")
    file_path = f"/tmp/{matches[0]}"
    return StreamingResponse(
        SseFormatter.format(use_case.execute(file_path)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
