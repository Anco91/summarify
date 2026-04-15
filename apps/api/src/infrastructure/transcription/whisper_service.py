from faster_whisper import WhisperModel
import asyncio
from typing import AsyncIterator
from src.core.config import get_settings
from src.domain.transcription.ports import ITranscriptionPort


class WhisperService(ITranscriptionPort):
    _instance: "WhisperService | None" = None  # Singleton

    def __new__(cls) -> "WhisperService":
        # Singleton pattern : le modele n'est charge qu'une seule fois
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"):
            return
        settings = get_settings()
        self.model = WhisperModel(
            settings.WHISPER_MODEL,
            device="cpu",
            compute_type="int8",  # Quantification int8 : 2x moins de RAM
            download_root="/app/models",  # Dossier pre-rempli par le Dockerfile
            local_files_only=True,  # Interdit le telechargement au runtime
        )
        self._initialized = True

    async def transcribe(self, file_path: str) -> AsyncIterator[str]:
        # Whisper est synchrone : run_in_executor evite de bloquer l'event loop
        loop = asyncio.get_event_loop()
        segments, _ = await loop.run_in_executor(
            None,
            lambda: self.model.transcribe(
                file_path, language=None, beam_size=5
            ),  # beam_size : nombre de chemins a explorer
        )
        for segment in segments:
            if segment.text.strip():  # ignorer les segments vides
                yield segment.text
