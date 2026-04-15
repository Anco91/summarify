from abc import ABC, abstractmethod
from typing import AsyncIterator


class ITranscriptionPort(ABC):
    @abstractmethod
    async def transcribe(self, file_path: str) -> AsyncIterator[str]:
        pass
