from groq import AsyncGroq

from src.domain.summary.ports import ILLMService

_SYSTEM_PROMPT = (
    "Tu es un assistant de synthese. Resume le texte fourni en "
    "3 points cles concis. N'invente aucune information. "
    "Reponds uniquement avec les points cles, sans introduction."
)

MODEL = "llama-3.3-70b-versatile"


class GroqService(ILLMService):
    def __init__(self) -> None:
        self.client = AsyncGroq()  # lit GROQ_API_KEY depuis l'env

    async def summarize(self, text: str) -> str:
        response = await self.client.chat.completions.create(
            model=MODEL,
            max_tokens=500,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
        )
        return response.choices[0].message.content or ""
