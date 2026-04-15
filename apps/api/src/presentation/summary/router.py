from fastapi import APIRouter
from pydantic import BaseModel, Field
from src.core.config import get_settings
from src.domain.summary.ports import ILLMService
from src.infrastructure.summary.openai_service import OpenAIService
from src.infrastructure.summary.ollama_service import OllamaService
from src.application.summary.use_cases import SummarizeTextUseCase

router = APIRouter(prefix="/api", tags=["summary"])


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Texte complet a resumer")


class SummarizeResponse(BaseModel):
    summary: str
    model: str  # indique quel LLM a ete utilise (utile pour le debug)


def get_llm_service() -> tuple[ILLMService, str]:
    settings = get_settings()
    if settings.use_openai:
        return OpenAIService(), "gpt-4o-mini"
    return OllamaService(), settings.OLLAMA_MODEL


@router.post("/summarize", response_model=SummarizeResponse, summary="Resume un texte via LLM")
async def summarize_text(body: SummarizeRequest) -> SummarizeResponse:
    service, model_name = get_llm_service()
    use_case = SummarizeTextUseCase(service)
    summary = await use_case.execute(body.text)
    return SummarizeResponse(summary=summary, model=model_name)
