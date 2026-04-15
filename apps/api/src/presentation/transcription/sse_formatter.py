from collections.abc import AsyncIterator


class SseFormatter:
    """Formate un flux de texte brut en événements SSE (Server-Sent Events).

    Seule couche autorisée à connaître le protocole SSE.
    Le domaine et l'application émettent du texte brut.
    """

    @staticmethod
    async def format(source: AsyncIterator[str]) -> AsyncIterator[str]:
        async for text in source:
            yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"
