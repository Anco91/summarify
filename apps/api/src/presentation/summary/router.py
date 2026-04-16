from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.application.summary.use_cases import SummarizeTextUseCase
from src.core.config import get_settings
from src.domain.summary.ports import ILLMService
from src.infrastructure.summary.groq_service import GroqService
from src.infrastructure.summary.openai_service import OpenAIService
from src.presentation.summary.schemas import SummarizeRequest, SummarizeResponse

router = APIRouter(prefix="/api", tags=["summary"])
limiter = Limiter(key_func=get_remote_address)


def _get_llm_service() -> tuple[ILLMService, str]:
    settings = get_settings()
    if settings.llm_backend == "openai":
        return OpenAIService(), "gpt-4o-mini"
    if settings.llm_backend == "groq":
        return GroqService(), "llama-3.3-70b-versatile"
    raise HTTPException(
        status_code=503,
        detail="Aucun LLM configuré. Définissez OPENAI_API_KEY ou GROQ_API_KEY.",
    )


@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    summary="Résume un texte via LLM",
)
@limiter.limit("10/minute")  # noqa: B008
async def summarize_text(request: Request, body: SummarizeRequest) -> SummarizeResponse:
    service, model_name = _get_llm_service()
    use_case = SummarizeTextUseCase(service)
    summary = await use_case.execute(body.text)
    return SummarizeResponse(summary=summary, model=model_name)
