from fastapi import APIRouter

from src.application.summary.use_cases import SummarizeTextUseCase
from src.core.config import get_settings
from src.domain.summary.ports import ILLMService
from src.infrastructure.summary.ollama_service import OllamaService
from src.infrastructure.summary.openai_service import OpenAIService
from src.presentation.summary.schemas import SummarizeRequest, SummarizeResponse

router = APIRouter(prefix="/api", tags=["summary"])


def _get_llm_service() -> tuple[ILLMService, str]:
    settings = get_settings()
    if settings.use_openai:
        return OpenAIService(), "gpt-4o-mini"
    return OllamaService(), settings.OLLAMA_MODEL


@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    summary="Résume un texte via LLM",
)
async def summarize_text(body: SummarizeRequest) -> SummarizeResponse:
    service, model_name = _get_llm_service()
    use_case = SummarizeTextUseCase(service)
    summary = await use_case.execute(body.text)
    return SummarizeResponse(summary=summary, model=model_name)
