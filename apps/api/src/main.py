from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import get_settings
from src.presentation.transcription.router import router as transcription_router
from src.presentation.summary.router import router as summary_router

settings = get_settings()
app = FastAPI(
    title="Summarify API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(transcription_router)
app.include_router(summary_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
