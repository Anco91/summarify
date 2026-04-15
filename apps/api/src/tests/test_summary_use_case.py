"""Tests unitaires — SummarizeTextUseCase."""
import pytest

from src.application.summary.use_cases import SummarizeTextUseCase
from src.domain.summary.ports import ILLMService


class _FakeLLM(ILLMService):
    def __init__(self, response: str = "• Point 1\n• Point 2\n• Point 3") -> None:
        self._response = response
        self.received_text: str = ""

    async def summarize(self, text: str) -> str:
        self.received_text = text
        return self._response


@pytest.mark.asyncio
async def test_execute_delegates_to_llm_service() -> None:
    """Le use case délègue au port sans modifier le texte (Tell Don't Ask)."""
    fake = _FakeLLM()
    use_case = SummarizeTextUseCase(fake)

    result = await use_case.execute("Texte à résumer " * 5)

    assert fake.received_text == "Texte à résumer " * 5
    assert result == "• Point 1\n• Point 2\n• Point 3"


@pytest.mark.asyncio
async def test_execute_propagates_llm_error() -> None:
    """Les erreurs du LLM remontent sans être avalées."""
    class _BrokenLLM(ILLMService):
        async def summarize(self, text: str) -> str:
            raise ConnectionError("LLM indisponible")

    use_case = SummarizeTextUseCase(_BrokenLLM())

    with pytest.raises(ConnectionError, match="indisponible"):
        await use_case.execute("texte de test suffisamment long")
