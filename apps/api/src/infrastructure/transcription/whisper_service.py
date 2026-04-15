import asyncio
import os
from collections.abc import AsyncIterator

from faster_whisper import WhisperModel

from src.core.config import get_settings
from src.core.logging import get_logger
from src.domain.transcription.ports import ITranscriptionPort

logger = get_logger(__name__)

# En dev local, /app/models n'existe pas — on autorise le téléchargement
_LOCAL_DEV = not os.path.isdir("/app/models")


class WhisperService(ITranscriptionPort):
    """Adaptateur faster-whisper. Singleton — le modèle n'est chargé qu'une fois."""

    _instance: "WhisperService | None" = None

    def __new__(cls) -> "WhisperService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if hasattr(self, "_initialized"):
            return
        settings = get_settings()
        logger.info("whisper_loading", model=settings.WHISPER_MODEL)
        self.model = WhisperModel(
            settings.WHISPER_MODEL,
            device="cpu",
            compute_type="int8",
            download_root="/app/models" if not _LOCAL_DEV else None,
            local_files_only=not _LOCAL_DEV,
        )
        self._initialized = True
        logger.info("whisper_ready", model=settings.WHISPER_MODEL)

    async def transcribe(
        self, file_path: str, language: str | None = None
    ) -> AsyncIterator[str]:
        """Lance la transcription dans un executor pour ne pas bloquer l'event loop."""
        loop = asyncio.get_running_loop()
        segments, info = await loop.run_in_executor(
            None,
            lambda: self.model.transcribe(
                file_path,
                language=language,  # None = autodétection
                beam_size=5,
            ),
        )
        logger.debug(
            "whisper_detected_language",
            language=info.language,
            probability=round(info.language_probability, 2),
        )
        for segment in segments:
            if segment.text.strip():
                yield segment.text
