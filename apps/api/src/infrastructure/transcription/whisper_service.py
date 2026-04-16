import asyncio
import os
from collections.abc import AsyncIterator

from faster_whisper import WhisperModel

from src.core.config import get_settings
from src.core.logging import get_logger
from src.domain.transcription.ports import ITranscriptionPort

logger = get_logger(__name__)

# En prod Docker, les modèles sont pré-téléchargés dans /app/models.
# En dev local, on utilise le cache HuggingFace par défaut (~/.cache).
_MODELS_DIR: str | None = "/app/models" if os.path.isdir("/app/models") else None


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
            download_root=_MODELS_DIR,
            # local_files_only omis : faster-whisper télécharge si le modèle
            # n'est pas en cache (ex. WHISPER_MODEL diffère de l'ARG Docker).
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
                beam_size=1,       # greedy — 3-5x plus rapide sur CPU
                vad_filter=True,  # ignore les silences → gain majeur sur audio long
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
