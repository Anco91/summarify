from openai import AsyncOpenAI  # Ollama expose une API compatible OpenAI

from src.core.config import get_settings
from src.domain.summary.ports import ILLMService

_SYSTEM_PROMPT = (
    "Tu es un assistant de synthese. Resume le texte fourni en "
    "3 points cles concis. N'invente aucune information. "
    "Reponds uniquement avec les points cles, sans introduction."
)


class OllamaService(ILLMService):
    def __init__(self) -> None:
        settings = get_settings()
        self.client = AsyncOpenAI(
            base_url=f"{settings.OLLAMA_BASE_URL}/v1",
            api_key="ollama",  # requis par le SDK mais ignore par Ollama
        )
        self.model = settings.OLLAMA_MODEL

    async def summarize(self, text: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            max_tokens=500,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
        )
        return response.choices[0].message.content or ""
