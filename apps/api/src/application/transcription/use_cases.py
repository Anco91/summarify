import asyncio
import os
import time
from collections.abc import AsyncIterator

from src.core.logging import get_logger
from src.domain.transcription.ports import ITranscriptionPort

logger = get_logger(__name__)


class TranscribeUseCase:
    """Orchestre la transcription : semaphore RAM + nettoyage fichier garanti."""

    def __init__(
        self, transcription_port: ITranscriptionPort, semaphore: asyncio.Semaphore
    ) -> None:
        self.transcription_port = transcription_port
        self.semaphore = semaphore

    async def execute(
        self, file_path: str, language: str | None = None
    ) -> AsyncIterator[str]:
        async with self.semaphore:
            start = time.monotonic()
            logger.info("transcription_start", file=file_path, language=language)
            try:
                async for text in self.transcription_port.transcribe(
                    file_path, language=language
                ):
                    yield text
                logger.info(
                    "transcription_done",
                    file=file_path,
                    duration_s=round(time.monotonic() - start, 2),
                )
            except Exception:
                logger.exception(
                    "transcription_error",
                    file=file_path,
                    duration_s=round(time.monotonic() - start, 2),
                )
                raise
            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)
