import time

from src.core.logging import get_logger
from src.domain.summary.ports import ILLMService

logger = get_logger(__name__)


class SummarizeTextUseCase:
    """Délègue la génération de résumé au port LLM injecté."""

    def __init__(self, llm_service: ILLMService) -> None:
        self.llm_service = llm_service

    async def execute(self, text: str) -> str:
        start = time.monotonic()
        logger.info("summary_start", text_length=len(text))
        try:
            result = await self.llm_service.summarize(text)
            logger.info(
                "summary_done",
                text_length=len(text),
                duration_s=round(time.monotonic() - start, 2),
            )
            return result
        except Exception:
            logger.exception("summary_error", text_length=len(text))
            raise
