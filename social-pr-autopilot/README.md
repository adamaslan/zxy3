# Social PR Autopilot

Autonomous social distribution and PR launch app combining Instagram content packs, Telegram publishing, Bluesky/X post generation, PR launch kits, and campaign calendar planning.

## Capability Bundle

- Instagram pack generator
- Telegram publishing bot
- Bluesky/X post generator
- Cross-channel caption adapter
- PR launch-kit agent
- Campaign calendar agent

## Stack

- Frontend: Next.js + Tailwind
- Backend: Python FastAPI
- AI: Mistral locally by default, Gemini-ready for GCP fallback/switching
- Tests: Playwright

## Robustness Added

- `/ready` endpoint with provider configuration status
- `/debug` endpoint with recent run and event timeline
- Structured JSON logs with request IDs, durations, run IDs, and event names
- Request IDs on every backend response
- In-memory agent run history at `/api/runs`
- Run IDs, risk levels, and publish policy on campaign packs
- Gemini/Mistral retry policy with deterministic demo mode
- Backend/frontend Dockerfiles, `compose.yaml`, Cloud Run/Scheduler templates
- FastAPI contract tests plus Playwright UI smoke test
- Stack-phase debugging runbook in `docs/debugging.md`

## Local Run Now

The backend loads env vars from the workspace `.env`, app `.env`, backend `.env`, or backend `.env.local`.
Your current root `.env` can use `MISTRAL_KEY`; Cloud Run should use the canonical `MISTRAL_API_KEY`.

```bash
cd social-pr-autopilot/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
AI_PROVIDER=mistral uvicorn app.main:app --reload --port 8102
```

```bash
cd social-pr-autopilot/frontend
npm install
NEXT_PUBLIC_API_BASE=http://localhost:8102 npm run dev -- --port 3102
```

Open `http://localhost:3102`.

## GCP Migration Shape

- Keep `AI_PROVIDER=mistral` while using the current Mistral key, or set `AI_PROVIDER=gemini`/`auto` later.
- Move local secrets into GCP Secret Manager as `MISTRAL_API_KEY`, `GEMINI_API_KEY`, Telegram, and Bluesky secrets.
- Deploy the backend Dockerfile to Cloud Run with `APP_ENV=production`, `DEPLOY_TARGET=gcp`, and `ALLOWED_ORIGINS` set to the frontend host.
- Build/deploy the frontend with `NEXT_PUBLIC_API_BASE` set to the backend Cloud Run URL.
- Use `automation/cloud-run-backend.yaml` as the starting Cloud Run template.

## Test Commands

```bash
# From social-pr-autopilot/backend, with venv activated:
pytest
```

```bash
cd social-pr-autopilot/frontend
npm install
npm run build
```

```bash
cd social-pr-autopilot/tests
npm install
npm test
```
