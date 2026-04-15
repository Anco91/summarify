import pytest
import asyncio
from unittest.mock import patch, MagicMock
from typing import AsyncIterator

# On importe uniquement le Domaine (l'interface) et le Use Case
# L'infrastructure (Whisper) N'EST PAS IMPORTÉE
from src.domain.transcription.ports import ITranscriptionPort
from src.application.transcription.use_cases import TranscribeUseCase


class FakeSuccessTranscription(ITranscriptionPort):
    """Simule un Whisper qui marche bien."""

    async def transcribe(self, file_path: str) -> AsyncIterator[str]:
        yield "Bonjour "
        yield "le "


class FakeFailingTranscription(ITranscriptionPort):
    """Simule un Whisper qui crashe (ex: erreur de mémoire)."""

    async def transcribe(self, file_path: str) -> AsyncIterator[str]:
        raise Exception("OOM Killed : Pas assez de RAM")
        yield  # Uniquement pour satisfaire le typage AsyncIterator


@pytest.mark.asyncio
async def test_use_case_should_format_text_to_sse():
    """Test le chemin heureux : Le texte doit être formaté en SSE."""
    # Arrange (On donne un faux service au Use Case)
    use_case = TranscribeUseCase(
        transcription_port=FakeSuccessTranscription(), semaphore=asyncio.Semaphore(1)
    )

    # Act (On consomme le générateur)
    results = []
    async for chunk in use_case.execute(file_path="fake_audio"):
        results.append(chunk)

    # Assert (Le format SSE est-il respecté ?)
    assert len(results) == 3
    assert results[0] == "data: Bonjour \n\n"
    assert results[1] == "data: le \n\n"
    assert results[2] == "data: done\n\n"


@pytest.mark.asyncio
async def test_use_case_should_delete_temp_file_on_success():
    """Version plus lisible avec les context managers."""

    # Arrange
    with (
        patch("src.application.transcription.use_cases.os.remove") as mock_remove,
        patch(
            "src.application.transcription.use_cases.os.path.exists", return_value=True
        ),
        patch(
            "src.application.transcription.use_cases.tempfile.NamedTemporaryFile"
        ) as mock_temp,
    ):
        mock_file = MagicMock()
        mock_file.name = "/tmp/fake_audio"
        mock_temp.return_value.__enter__.return_value = mock_file

        use_case = TranscribeUseCase(
            transcription_port=FakeSuccessTranscription(),
            semaphore=asyncio.Semaphore(1),
        )

        # Act
        async for _ in use_case.execute(file_path="/tmp/fake_audio"):
            pass

        # Assert
        mock_remove.assert_called_once_with("/tmp/fake_audio")


async def test_use_case_should_delete_temp_file_even_on_error():
    """Test la sécurité : Le fichier temp DOIT être supprimé même en cas d'erreur."""
    # Arrange
    with (
        patch("src.application.transcription.use_cases.os.remove") as mock_remove,
        patch(
            "src.application.transcription.use_cases.os.path.exists", return_value=True
        ),
        patch(
            "src.application.transcription.use_cases.tempfile.NamedTemporaryFile"
        ) as mock_temp,
    ):
        mock_file = MagicMock()
        mock_file.name = "/tmp/fake_audio"
        mock_temp.return_value.__enter__.return_value = mock_file

        use_case = TranscribeUseCase(
            transcription_port=FakeFailingTranscription(),
            semaphore=asyncio.Semaphore(1),
        )

        # Act
        with pytest.raises(Exception):
            async for _ in use_case.execute(file_path="/tmp/fake_audio"):
                pass

        # Assert
        mock_remove.assert_called_once_with("/tmp/fake_audio")
