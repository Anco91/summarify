"""
Tests d'intégration — router /api/summarize.
On override le LLM via Depends pour ne jamais appeler OpenAI/Ollama.
"""
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app

BASE = "http://test"


@pytest.fixture()
async def client() -> AsyncClient:  # type: ignore[misc]
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url=BASE
    ) as ac:
        yield ac  # type: ignore[misc]


@pytest.mark.asyncio
async def test_summarize_returns_summary_and_model(client: AsyncClient) -> None:
    with patch(
        "src.presentation.summary.router._get_llm_service",
        return_value=(_fake_llm(), "test-model"),
    ):
        resp = await client.post(
            "/api/summarize",
            json={"text": "Texte de test suffisamment long pour passer la validation."},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["summary"] == "Résumé factice"
    assert body["model"] == "test-model"


@pytest.mark.asyncio
async def test_summarize_rejects_short_text(client: AsyncClient) -> None:
    resp = await client.post("/api/summarize", json={"text": "court"})
    assert resp.status_code == 422


def _fake_llm():  # type: ignore[return]
    from src.domain.summary.ports import ILLMService

    class Fake(ILLMService):
        async def summarize(self, text: str) -> str:
            return "Résumé factice"

    return Fake()
