# Summarify

Transcription audio en temps réel + résumé IA. Upload un fichier audio, récupère la transcription segment par segment via SSE, puis génère un résumé en 3 points.

## Stack

| Couche | Techno |
|--------|--------|
| Frontend | Next.js 16, React 19, Tailwind v4, shadcn/ui |
| Formulaires | React Hook Form + Zod |
| API client | Orval (hooks react-query + schemas Zod générés depuis OpenAPI) |
| Backend | FastAPI, Python 3.11, uv |
| Transcription | faster-whisper (Whisper base local) |
| LLM résumé | OpenAI `gpt-4o-mini` si `OPENAI_API_KEY` fourni, sinon Ollama `qwen2.5:3b` en local |
| Infra | Docker multi-stage, GitHub Actions CI |

## Démarrage rapide

### Backend

```bash
cd apps/api
cp .env.example .env          # renseigner OPENAI_API_KEY si souhaité
uv sync
uv run uvicorn src.main:app --reload
# → http://localhost:8000/docs
```

### Frontend

```bash
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

### Docker (API seule)

```bash
docker build -t summarify-api apps/api
docker run -p 8000:8000 \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  summarify-api
```

## Variables d'environnement

### API (`apps/api/.env`)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `OPENAI_API_KEY` | _(vide)_ | Si fourni, utilise OpenAI. Sinon, Ollama. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL du serveur Ollama |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Modèle Ollama pour le résumé |
| `WHISPER_MODEL` | `base` | Taille du modèle Whisper (`tiny` / `base` / `small` / `medium`) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS — séparés par virgule ou JSON array |
| `MAX_UPLOAD_SIZE_MB` | `50` | Limite upload |
| `MAX_CONCURRENT_TRANSCRIPTIONS` | `1` | Parallélisme Whisper (RAM) |

### Frontend (`apps/web/.env.local`)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL de l'API backend |

## Générer les types API

L'API client TypeScript est générée depuis `packages/contracts/openapi.yaml` :

```bash
cd apps/web
npm run generate:api   # génère src/shared/api/ (hooks + schemas Zod)
```

## Tests

```bash
cd apps/api
uv run pytest -v
uv run ruff check src/
```

## Architecture

```
summarify/
├── apps/
│   ├── api/                     # FastAPI — architecture hexagonale
│   │   └── src/
│   │       ├── domain/          # ports (interfaces)
│   │       ├── application/     # use cases
│   │       ├── infrastructure/  # Whisper, OpenAI, Ollama
│   │       └── presentation/    # routers, schemas
│   └── web/                     # Next.js
│       └── src/
│           ├── features/        # feature slices (audio-upload, summary)
│           ├── shared/api/      # généré par Orval
│           └── components/ui/   # shadcn/ui
└── packages/
    └── contracts/               # openapi.yaml — source of truth
```

Flux : `POST /api/upload` → job_id → `GET /api/stream/{job_id}` (SSE) → `POST /api/summarize`
