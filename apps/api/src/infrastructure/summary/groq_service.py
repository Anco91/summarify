from groq import AsyncGroq

from src.domain.summary.ports import ILLMService

_SYSTEM_PROMPT = (
    "Summarize the following text in 3 concise key points. "
    "Respond in the same language as the input text. "
    "Do not invent any information. Output only the key points, no introduction."
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
