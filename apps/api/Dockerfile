# apps/api/Dockerfile
FROM python:3.11-slim AS base
WORKDIR /app
# Copier le binaire uv depuis son image officielle
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# Stage : dependances Python
FROM base AS deps
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

# Stage : pre-telechargement du modele Whisper
FROM deps AS model
# Ce stage est mis en cache par Docker : ne se relance que si pyproject.toml change
ARG WHISPER_MODEL=tiny
RUN uv run python -c "from faster_whisper import WhisperModel; print('Telechargement du modele Whisper ${WHISPER_MODEL}...'); model = WhisperModel('${WHISPER_MODEL}', download_root='/app/models'); print('Modele telecharge et cache dans /app/models')"

# Stage final
FROM model AS final
COPY src/ src/

EXPOSE 8000

# Healthcheck : Render/Fly.io verifie cette route avant de router le trafic
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# 1 worker : evite de charger le modele Whisper plusieurs fois
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]