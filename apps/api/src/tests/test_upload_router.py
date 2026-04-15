"""
Tests d'intégration — router /api/upload.
Utilise httpx AsyncClient avec l'app FastAPI complète.
Whisper n'est PAS initialisé (le lifespan warmup est ignoré en test).
"""
import io

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app

BASE = "http://test"

# Désactive le lifespan pour les tests (évite le warmup Whisper)
pytestmark = pytest.mark.anyio


@pytest.fixture()
async def client() -> AsyncClient:  # type: ignore[misc]
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url=BASE
    ) as ac:
        yield ac  # type: ignore[misc]


def _make_audio_file(size_bytes: int = 1024, mime: str = "audio/mpeg") -> dict:  # type: ignore[type-arg]
    return {"file": ("test.mp3", io.BytesIO(b"0" * size_bytes), mime)}


# ──────────────────────────────────────────────
# Chemin heureux
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_returns_job_id(client: AsyncClient) -> None:
    resp = await client.post("/api/upload", files=_make_audio_file())
    assert resp.status_code == 200
    body = resp.json()
    assert "job_id" in body
    assert len(body["job_id"]) == 36  # UUID v4


# ──────────────────────────────────────────────
# Cas d'erreur
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_rejects_oversized_file(client: AsyncClient) -> None:
    large = 51 * 1024 * 1024  # 51 Mo
    resp = await client.post("/api/upload", files=_make_audio_file(large))
    assert resp.status_code == 413


@pytest.mark.asyncio
async def test_upload_rejects_unsupported_mime(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/upload",
        files={"file": ("doc.pdf", io.BytesIO(b"fake"), "application/pdf")},
    )
    assert resp.status_code == 415


@pytest.mark.asyncio
async def test_stream_returns_404_for_unknown_job(client: AsyncClient) -> None:
    resp = await client.get("/api/stream/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_health_returns_ok(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
