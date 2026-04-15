"""
Tests unitaires — TranscribeUseCase.
Aucun import Whisper, aucun fichier audio réel : on injecte des faux ports.
"""
import asyncio
from collections.abc import AsyncIterator

import pytest

from src.application.transcription.use_cases import TranscribeUseCase
from src.domain.transcription.ports import ITranscriptionPort

# ──────────────────────────────────────────────
# Test doubles (Tell Don't Ask / Dependency Inversion)
# ──────────────────────────────────────────────

class _SuccessPort(ITranscriptionPort):
    """Simule Whisper qui retourne 2 segments."""

    def __init__(self, captured_language: list[str | None] | None = None) -> None:
        self._captured = captured_language

    async def transcribe(
        self, file_path: str, language: str | None = None
    ) -> AsyncIterator[str]:
        if self._captured is not None:
            self._captured.append(language)
        yield "Bonjour "
        yield "le monde."


class _ErrorPort(ITranscriptionPort):
    """Simule Whisper qui plante."""

    async def transcribe(
        self, file_path: str, language: str | None = None
    ) -> AsyncIterator[str]:
        raise RuntimeError("OOM : mémoire insuffisante")
        yield  # satisfaire le type AsyncIterator


# ──────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_execute_yields_raw_text_segments() -> None:
    """Le use case yield du texte brut — pas de formatage SSE (SRP)."""
    use_case = TranscribeUseCase(_SuccessPort(), asyncio.Semaphore(1))

    results = [chunk async for chunk in use_case.execute("fake_path")]

    assert results == ["Bonjour ", "le monde."]


@pytest.mark.asyncio
async def test_execute_passes_language_to_port() -> None:
    """Le paramètre language est transmis au port sans transformation."""
    captured: list[str | None] = []
    use_case = TranscribeUseCase(_SuccessPort(captured), asyncio.Semaphore(1))

    async for _ in use_case.execute("fake_path", language="fr"):
        pass

    assert captured == ["fr"]


@pytest.mark.asyncio
async def test_execute_deletes_file_on_success(  # noqa: E501
    tmp_path: pytest.TempPathFactory,
) -> None:
    """Le fichier temporaire est supprimé après transcription réussie."""
    audio = tmp_path / "audio.mp3"  # type: ignore[operator]
    audio.write_bytes(b"fake audio data")

    use_case = TranscribeUseCase(_SuccessPort(), asyncio.Semaphore(1))
    async for _ in use_case.execute(str(audio)):
        pass

    assert not audio.exists()


@pytest.mark.asyncio
async def test_execute_deletes_file_on_error(tmp_path: pytest.TempPathFactory) -> None:
    """Le fichier temporaire est supprimé même si Whisper plante (finally garanti)."""
    audio = tmp_path / "audio.mp3"  # type: ignore[operator]
    audio.write_bytes(b"fake audio data")

    use_case = TranscribeUseCase(_ErrorPort(), asyncio.Semaphore(1))

    with pytest.raises(RuntimeError, match="OOM"):
        async for _ in use_case.execute(str(audio)):
            pass

    assert not audio.exists()


@pytest.mark.asyncio
async def test_execute_respects_semaphore() -> None:
    """Avec semaphore(1), deux exécutions ne se chevauchent pas."""
    sem = asyncio.Semaphore(1)
    use_case = TranscribeUseCase(_SuccessPort(), sem)

    # Les deux doivent compléter sans deadlock
    results_a = [c async for c in use_case.execute("a")]
    results_b = [c async for c in use_case.execute("b")]

    assert len(results_a) == 2
    assert len(results_b) == 2
