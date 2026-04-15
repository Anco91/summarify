from abc import ABC, abstractmethod


class ILLMService(ABC):
    @abstractmethod
    async def summarize(self, text: str) -> str:
        pass
