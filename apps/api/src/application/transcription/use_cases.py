import os, asyncio
import tempfile
from typing import AsyncIterator
from src.domain.transcription.ports import ITranscriptionPort


class TranscribeUseCase:
    def __init__(
        self, transcription_port: ITranscriptionPort, semaphore: asyncio.Semaphore
    ):
        self.transcription_port = transcription_port
        self.semaphore = semaphore

    async def execute(self, file_path: str) -> AsyncIterator[str]:
        async with self.semaphore:
            try:
                async for text in self.transcription_port.transcribe(file_path):
                    yield text
            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)
