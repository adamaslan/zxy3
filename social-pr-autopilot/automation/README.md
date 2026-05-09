# Automation Notes

## Local

```bash
docker compose up --build
```

The compose file reads the workspace `../.env` for local secrets. `MISTRAL_KEY` works locally as an alias; prefer `MISTRAL_API_KEY` in deployed environments.

## Backend Contract Tests

```bash
cd backend
pip install -r requirements.txt
pytest
```

## GCP Deployment Shape

- Build backend image with Cloud Build or Artifact Registry.
- Deploy the backend as Cloud Run.
- Build the frontend image with `NEXT_PUBLIC_API_BASE` set to the Cloud Run backend URL.
- Store Mistral, Gemini, Telegram, Bluesky, Instagram, and X secrets in Secret Manager.
- Set `APP_ENV=production`, `DEPLOY_TARGET=gcp`, and keep `AI_PROVIDER=mistral` until you intentionally switch providers.
- Trigger campaign generation from Cloud Scheduler.

Use `cloud-run-backend.yaml` and `cloud-scheduler.yaml` as templates, not final project-specific manifests.

## Debugging

- Query `/debug` before and after a scheduled run to confirm a new `run_id`.
- Filter Cloud Run logs by `event=agent_run_finished`, `event=request_failed`, or a specific `run_id`.
- Use the `x-request-id` response header to connect frontend actions to backend logs.
