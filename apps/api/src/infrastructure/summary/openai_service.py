from openai import AsyncOpenAI

from src.domain.summary.ports import ILLMService

_SYSTEM_PROMPT = (
    "Summarize the following text in 3 concise key points. "
    "Respond in the same language as the input text. "
    "Do not invent any information. Output only the key points, no introduction."
)


class OpenAIService(ILLMService):
    def __init__(self) -> None:
        self.client = AsyncOpenAI()  # lit OPENAI_API_KEY depuis l'env

    async def summarize(self, text: str) -> str:
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=500,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
        )
        return response.choices[0].message.content or ""
