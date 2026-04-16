"""
SessionStore — buffer en mémoire pour les sessions de transcription.

Chaque session stocke les segments déjà émis et fan-out vers tous les
clients SSE connectés (reconnexion sans perte de données).
"""
import asyncio
import time
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class SessionState:
    session_id: str
    status: Literal["queued", "transcribing", "done", "error"]
    segments: list[str]
    filename: str
    language: str | None
    # Un Queue par client SSE connecté (fan-out pattern)
    subscribers: list[asyncio.Queue] = field(default_factory=list)
    created_at: float = field(default_factory=time.monotonic)
    error: str | None = None


class SessionStore:
    """Registre asyncio-safe session_id → SessionState."""

    def __init__(self) -> None:
        self._store: dict[str, SessionState] = {}
        self._lock = asyncio.Lock()

    async def create(
        self,
        session_id: str,
        filename: str,
        language: str | None = None,
    ) -> SessionState:
        state = SessionState(
            session_id=session_id,
            status="queued",
            segments=[],
            filename=filename,
            language=language,
        )
        async with self._lock:
            self._store[session_id] = state
        return state

    async def get(self, session_id: str) -> SessionState | None:
        async with self._lock:
            return self._store.get(session_id)

    async def update_status(
        self,
        session_id: str,
        status: Literal["queued", "transcribing", "done", "error"],
    ) -> None:
        async with self._lock:
            if session_id in self._store:
                self._store[session_id].status = status

    async def add_segment(self, session_id: str, text: str) -> None:
        """Ajoute un segment et le distribue à tous les abonnés SSE actifs."""
        async with self._lock:
            state = self._store.get(session_id)
            if state is None:
                return
            state.segments.append(text)
            for q in state.subscribers:
                q.put_nowait(text)

    async def mark_done(self, session_id: str) -> None:
        """Marque la session terminée et envoie le sentinel None aux abonnés."""
        async with self._lock:
            state = self._store.get(session_id)
            if state is None:
                return
            state.status = "done"
            for q in state.subscribers:
                q.put_nowait(None)

    async def mark_error(self, session_id: str, message: str) -> None:
        """Marque la session en erreur et envoie le sentinel None aux abonnés."""
        async with self._lock:
            state = self._store.get(session_id)
            if state is None:
                return
            state.status = "error"
            state.error = message
            for q in state.subscribers:
                q.put_nowait(None)

    async def cleanup_stale(self, max_age_s: int = 3600) -> int:
        """Supprime les sessions plus anciennes que max_age_s."""
        cutoff = time.monotonic() - max_age_s
        async with self._lock:
            stale = [
                sid
                for sid, s in self._store.items()
                if s.created_at < cutoff
            ]
            for sid in stale:
                del self._store[sid]
        return len(stale)


# Singleton partagé par tous les routers
session_store = SessionStore()
