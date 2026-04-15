from src.domain.summary.ports import ILLMService


class SummarizeTextUseCase:
    def __init__(self, llm_service: ILLMService) -> None:
        self.llm_service = llm_service

    async def execute(self, text: str) -> str:
        return await self.llm_service.summarize(text)
