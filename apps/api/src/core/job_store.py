"""
JobStore — registre en mémoire des jobs de transcription.

Remplace os.listdir("/tmp") par un registre explicite job_id → file_path.
Garantit l'isolation entre jobs concurrents et évite toute collision de noms.
"""
import asyncio
import time


class JobStore:
    """Registre thread-safe job_id → (file_path, created_at)."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[str, float]] = {}
        self._lock = asyncio.Lock()

    async def put(self, job_id: str, file_path: str) -> None:
        async with self._lock:
            self._store[job_id] = (file_path, time.monotonic())

    async def pop(self, job_id: str) -> str | None:
        """Retourne et supprime le chemin associé au job_id, ou None si inconnu."""
        async with self._lock:
            entry = self._store.pop(job_id, None)
            return entry[0] if entry else None

    async def cleanup_stale(self, max_age_s: int = 3600) -> int:
        """Supprime les jobs plus anciens que max_age_s. Retourne le nombre supprimé."""
        import os

        cutoff = time.monotonic() - max_age_s
        async with self._lock:
            stale = [jid for jid, (_, ts) in self._store.items() if ts < cutoff]
            for jid in stale:
                path, _ = self._store.pop(jid)
                if os.path.exists(path):
                    os.remove(path)
        return len(stale)


# Singleton partagé par tous les routers
job_store = JobStore()
