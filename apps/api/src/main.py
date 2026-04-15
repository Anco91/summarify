from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from src.core.config import get_settings
from src.core.job_store import job_store
from src.core.logging import configure_logging, get_logger
from src.presentation.summary.router import router as summary_router
from src.presentation.transcription.router import limiter
from src.presentation.transcription.router import router as transcription_router

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Warmup au démarrage, nettoyage à l'arrêt."""
    settings = get_settings()

    # Warmup Whisper (évite le cold-start sur la première requête)
    from src.infrastructure.transcription.whisper_service import WhisperService
    WhisperService()

    # Nettoyage /tmp : fichiers audio orphelins > 1h
    removed = await job_store.cleanup_stale(max_age_s=3600)
    if removed:
        logger.info("startup_cleanup", stale_files_removed=removed)

    # Log du backend LLM actif
    backend = settings.llm_backend
    if backend == "openai":
        logger.info("llm_backend", provider="openai", model="gpt-4o-mini")
    elif backend == "groq":
        logger.info("llm_backend", provider="groq", model="llama-3.3-70b-versatile")
    else:
        logger.warning(
            "llm_backend",
            provider="none",
            note="Aucune clé LLM configurée — /api/summarize retournera 503",
        )

    yield

    logger.info("shutdown")


settings = get_settings()

app = FastAPI(
    title="Summarify API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcription_router)
app.include_router(summary_router)


@app.get("/health", tags=["ops"])
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})
