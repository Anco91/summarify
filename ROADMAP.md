# Summarify — Audit V1 & Roadmap V2

> Audit technique honnête de la V1 MVP. Chaque point est classé par impact réel en production.

---

## État de la V1

La V1 est un **MVP fonctionnel** : upload audio → transcription SSE temps réel → export PDF → résumé LLM.  
Architecture hexagonale propre, stack moderne, zéro dette de conception.  
Mais plusieurs fragilités empêchent de la considérer comme "production-ready".

---

## 🔴 Critique — cassant en prod

### 1. Pas de persistance des jobs
`/tmp` est vidé au redémarrage du conteneur. Sur Render, les conteneurs redémarrent régulièrement.  
Un job en cours → perdu sans message d'erreur. Aucune trace côté serveur de ce qui a réussi ou échoué.

**Fix V1 minimal** : stocker les métadonnées job en mémoire (dict global avec TTL).  
**Fix V2** : PostgreSQL ou Supabase — table `jobs(id, status, file_path, created_at, transcript)`.

---

### 2. Pas de reconnexion SSE
Si le réseau coupe à mi-transcription, `useTranscriptionSSE` passe en `error` et s'arrête.  
Aucun retry, aucune reprise. Sur mobile 4G c'est fréquent.

**Fix V1 minimal** :
```typescript
es.onerror = () => {
  if (retryCount < 3) {
    setTimeout(() => startStream(jobId), 2000 * retryCount);
    retryCount++;
  } else {
    setStatus("error");
    es.close();
  }
};
```

**Fix V2** : stocker la transcription partielle côté serveur → l'utilisateur peut reprendre depuis où il en était.

---

### 3. Aucun rate limiting
N'importe qui peut uploader 100 fichiers de 50 Mo simultanément.  
Le semaphore protège la RAM Whisper mais pas `/tmp` (risque de disk full) ni la bande passante.

**Fix V1** : `slowapi` sur FastAPI — 5 uploads/minute par IP.
```bash
uv add slowapi
```
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/upload")
@limiter.limit("5/minute")
async def upload_audio(request: Request, file: UploadFile = File(...)):
    ...
```

---

### 4. Validation côté client absente
La taille est vérifiée côté serveur uniquement. L'utilisateur attend la fin de l'upload (plusieurs secondes sur mobile) avant d'avoir une erreur 413.

**Fix V1** : valider avant `fetch` dans `useUploadMutation`.
```typescript
if (file.size > 50 * 1024 * 1024) {
  throw new Error("Fichier trop volumineux (max 50 Mo)");
}
const ACCEPTED = ["audio/mpeg","audio/wav","audio/mp4","audio/ogg","audio/flac","audio/x-m4a"];
if (!ACCEPTED.includes(file.type)) {
  throw new Error("Format non supporté");
}
```

---

### 5. Risque de collision de fichiers /tmp
`os.listdir("/tmp")` itère tous les fichiers du système. Si un job_id est malformé ou si deux jobs coexistent, un match partiel peut pointer vers le mauvais fichier.

**Fix V1** : stocker le chemin exact au moment de l'upload dans un dict en mémoire.
```python
# Dans router.py — dict global avec expiration
_JOBS: dict[str, str] = {}  # job_id -> file_path

@router.post("/upload")
async def upload_audio(...):
    ...
    _JOBS[job_id] = path
    return JSONResponse({"job_id": job_id})

@router.get("/stream/{job_id}")
async def stream_transcription(job_id: str, ...):
    if job_id not in _JOBS:
        raise HTTPException(404, "Job introuvable")
    file_path = _JOBS.pop(job_id)  # consomme le job
    ...
```

---

### 6. Tests : zéro
Les fichiers `tests/` sont vides. Aucune CI. Chaque déploiement est un pari.

**Fix V1 — tests minimaux à écrire** :
```
tests/
├── test_transcribe_use_case.py   # mock ITranscriptionPort → vérifie SSE format
├── test_summary_use_case.py      # mock ILLMService → vérifie délégation
├── test_upload_router.py         # httpx TestClient → vérifie 200 / 413
└── test_config.py                # vérifie parsing ALLOWED_ORIGINS
```

**Fix V1 — CI GitHub Actions** :
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: cd apps/api && uv run pytest -v
      - run: cd apps/api && uv run ruff check src/

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: cd apps/web && npx tsc --noEmit
      - run: cd apps/web && npm run build
```

---

### 7. Whisper se charge au premier appel, pas au démarrage
Le Singleton initialise le modèle à la première requête HTTP.  
Le premier utilisateur attend 5-15 secondes supplémentaires.  
Le healthcheck `/health` répond `ok` même si Whisper n'est pas prêt.

**Fix V1** :
```python
# src/main.py
from src.infrastructure.transcription.whisper_service import WhisperService

@app.on_event("startup")
async def warmup():
    """Charge le modèle Whisper au démarrage, pas à la première requête."""
    WhisperService()  # initialise le singleton
```

---

## 🟠 Majeur — bloque la scalabilité

### 8. Pas de vrai job queue
Le semaphore limite à 1 transcription simultanée. Le 2e utilisateur attend en silence.  
Pas de position dans la file, pas d'estimation, pas de notification quand c'est prêt.

**V2** : ARQ (async Redis Queue) ou Celery + Redis.
```
POST /api/upload → { job_id }
GET  /api/jobs/{job_id}/status → { status: "queued|processing|done|error", position: 2 }
GET  /api/stream/{job_id} → SSE (attend que le job soit traité)
```

---

### 9. `asyncio.get_event_loop()` déprécié depuis Python 3.10
`whisper_service.py` utilise `get_event_loop()` → warning en 3.12, erreur en 3.14.

**Fix V1** : remplacer par `asyncio.get_running_loop()`.
```python
# Avant
loop = asyncio.get_event_loop()
# Après
loop = asyncio.get_running_loop()
```

---

### 10. Pas de structured logging / observabilité
En prod, `uvicorn` sort des logs bruts. Aucun request ID, aucune durée par job.  
Impossible de débugger un problème client spécifique.

**Fix V1** :
```bash
uv add structlog sentry-sdk
```
```python
# src/core/logging.py
import structlog
structlog.configure(
    processors=[structlog.processors.JSONRenderer()],
)
logger = structlog.get_logger()

# Dans le use case :
logger.info("transcription_start", job_id=job_id, file_size_mb=size_mb)
logger.info("transcription_done", job_id=job_id, duration_s=elapsed)
```

---

### 11. Ollama en prod non résolu
Si `OPENAI_API_KEY` est vide en prod (Render/Fly.io), l'API appelle `localhost:11434` → timeout.  
Le fallback Ollama n'est réaliste qu'en dev local.

**Fix V1** : détecter le contexte au démarrage et logger clairement.
```python
@app.on_event("startup")
async def check_llm_config():
    if not settings.OPENAI_API_KEY:
        logger.warning("llm_mode", backend="ollama", url=settings.OLLAMA_BASE_URL,
                       note="assurez-vous qu'Ollama tourne")
    else:
        logger.info("llm_mode", backend="openai", model="gpt-4o-mini")
```

---

## 🟡 Qualité produit

### 12. Pas de sélection de langue
Whisper détecte automatiquement (`language=None`) mais c'est plus lent et moins précis.

**Fix V1** : paramètre optionnel dans l'URL.
```
GET /api/stream/{job_id}?lang=fr
```
```python
@router.get("/stream/{job_id}")
async def stream_transcription(job_id: str, lang: str | None = None, ...):
    # passer lang au use case → whisper_service
```

---

### 13. Timestamps ignorés — pas d'export SRT/VTT
Whisper retourne les timestamps de chaque segment. On les ignore complètement.  
C'est la feature #1 pour du sous-titrage.

**V2** : endpoint `GET /api/export/{job_id}?format=srt|vtt|txt`.

---

### 14. Summary sans streaming
L'utilisateur attend 3-8 secondes sans feedback pendant que le LLM génère.

**V2** : `GET /api/summarize/stream` en SSE avec `stream=True` côté OpenAI/Ollama.

---

### 15. Pas de copie dans le presse-papiers
Feature attendue sur n'importe quel outil de transcription.

**Fix V1** : 3 lignes dans `TranscriptionViewer`.
```typescript
<button onClick={() => navigator.clipboard.writeText(text)}>
  Copier
</button>
```

---

### 16. Pas d'accessibilité
Zéro `aria-label`, pas de navigation clavier, contraste non vérifié.

**Fix V1 minimal** :
- `aria-live="polite"` sur `TranscriptionViewer`
- `aria-busy={status === "streaming"}` sur le conteneur
- Vérifier contraste avec [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

### 17. Pas de feedback de progression
Pendant la transcription : un point clignotant. Rien d'autre.

**Fix V1** : compter les segments reçus + afficher la durée écoulée.
```typescript
const [segmentCount, setSegmentCount] = useState(0);
es.onmessage = (event) => {
  if (event.data !== "[DONE]") setSegmentCount(c => c + 1);
  ...
};
// Afficher : "142 segments · 00:34"
```

---

### 18. Pas de Dark Mode
Le design est light-only. Aucune media query `prefers-color-scheme`.

**Fix V1** : Tailwind `dark:` classes + `darkMode: 'media'` dans `tailwind.config`.

---

## 🔵 Dette technique

### 19. Orval configuré mais non utilisé
`npm run generate:api` est configuré mais les hooks sont écrits manuellement.  
Double source de vérité : si l'openapi.yaml change, les hooks manuels ne suivent pas.

**Fix V2** : supprimer `useUploadMutation` et `useSummaryMutation` manuels, utiliser les hooks Orval générés.

---

### 20. Pas de gestion de la mémoire /tmp
Les fichiers audio sont supprimés après transcription (`finally: os.remove`).  
Mais si le serveur plante pendant la transcription, le fichier reste.

**Fix V1** : tâche de nettoyage au démarrage.
```python
@app.on_event("startup")
async def cleanup_tmp():
    import glob, time
    stale = [f for f in glob.glob("/tmp/*.mp3") + glob.glob("/tmp/*.wav") + ...
             if time.time() - os.path.getmtime(f) > 3600]  # > 1h
    for f in stale:
        os.remove(f)
```

---

### 21. `jspdf-autotable` types manquants
Le package `@types/jspdf` n'existe pas (jspdf inclut ses propres types).  
`jspdf-autotable` nécessite une augmentation de module pour TypeScript strict.

**Fix V1** :
```typescript
// src/shared/lib/jspdf-augment.d.ts
import "jspdf";
import autoTable from "jspdf-autotable";
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}
```

---

## Checklist V1 solide (avant de considérer V2)

```
Sécurité & Robustesse
[ ] Rate limiting (slowapi) — 5 uploads/min/IP
[ ] Validation client-side avant upload (taille + type MIME)
[ ] In-memory job store (dict global) — supprime le os.listdir /tmp
[ ] Reconnexion SSE automatique (3 retries exponentiels)
[ ] Warmup Whisper au startup
[ ] Nettoyage /tmp au démarrage (fichiers > 1h)
[ ] get_event_loop() → get_running_loop()

Observabilité
[ ] structlog + JSON logging
[ ] Sentry error tracking (5 min à configurer)
[ ] Log durée transcription par job

Tests & CI
[ ] Tests unitaires Use Cases (mock ports)
[ ] Tests router avec httpx TestClient
[ ] GitHub Actions CI (pytest + tsc + build)

UX
[ ] Validation client-side avec message d'erreur immédiat
[ ] Compteur de segments + chronomètre
[ ] Bouton copier dans le presse-papiers
[ ] aria-live sur le viewer (accessibilité minimale)
[ ] Sélection de langue (fr/en/auto)

Prod
[ ] Log LLM backend au démarrage (openai vs ollama)
[ ] CORS strict (pas de wildcard en prod)
[ ] .env.example complet et documenté
```

---

## Roadmap V2 — features qui font un vrai produit

| # | Feature | Valeur | Effort |
|---|---------|--------|--------|
| 1 | Auth utilisateurs (NextAuth.js) | Historique personnel | M |
| 2 | Persistance PostgreSQL/Supabase | Retrouver ses transcriptions | M |
| 3 | Job queue async (ARQ + Redis) | Multi-users, retry, position | L |
| 4 | Export SRT/VTT (timestamps Whisper) | Sous-titrage | S |
| 5 | Summary streamé (SSE) | UX fluide | S |
| 6 | Sélection de langue | Précision +20% | S |
| 7 | Diarisation (qui parle ?) | Réunions, interviews | XL |
| 8 | API publique + clés API | Usage programmatique | M |
| 9 | Partage de transcription | Collaboration | M |
| 10 | Dark mode | Confort | S |

---

## Stack V2 recommandée

```
Backend          FastAPI + ARQ + Redis + PostgreSQL + SQLAlchemy
Auth             FastAPI-Users ou custom JWT
Monitoring       Sentry + Prometheus + Grafana
Storage          S3/R2 (fichiers audio > /tmp)
Frontend         Next.js (inchangé) + Zustand (état global)
DB hosting       Supabase (PostgreSQL managé + Auth)
Cache            Redis (jobs + rate limiting)
Deploy backend   Fly.io (plus de contrôle que Render pour Redis)
```

---

*Summarify V1 — Audit généré le $(date +%Y-%m-%d)*
