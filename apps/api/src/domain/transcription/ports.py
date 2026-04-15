from abc import ABC, abstractmethod
from collections.abc import AsyncIterator


class ITranscriptionPort(ABC):
    @abstractmethod
    async def transcribe(
        self, file_path: str, language: str | None = None
    ) -> AsyncIterator[str]:
        """Transcrit un fichier audio en segments de texte brut.

        Args:
            file_path: Chemin absolu vers le fichier audio temporaire.
            language: Code ISO 639-1 (ex: 'fr', 'en') ou None pour autodétection.

        Yields:
            Segments de texte brut, sans formatage SSE.
        """
