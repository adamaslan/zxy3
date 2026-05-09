# Logging And Debugging Runbook

## Frontend Phase

- Check the header status lines for backend readiness and debug snapshot availability.
- Confirm `NEXT_PUBLIC_API_BASE` points to the expected backend.
- Use browser devtools Network tab to capture the `x-request-id` response header.
- Re-run the same action and compare whether a new `run_id` appears in the result.

## Backend API Phase

- `GET /health` confirms the process is reachable.
- `GET /ready` confirms uptime, selected AI provider, Mistral/Gemini configuration, and local/GCP deployment mode.
- `GET /debug` returns recent runs, run status counts, and recent event timeline.
- `GET /api/runs/{run_id}` shows one specific campaign generation run.
- Logs are JSON and include `request_id`, method, path, status, duration, event, and run ID when available.

## AI Provider Phase

- Events include `ai_provider_attempt`, `ai_provider_success`, `ai_provider_error`, `ai_provider_fallback`, and `ai_demo_mode_used`.
- Local mode defaults to Mistral and accepts either `MISTRAL_KEY` or `MISTRAL_API_KEY`.
- On GCP, prefer the canonical `MISTRAL_API_KEY` Secret Manager value and set `AI_PROVIDER=mistral`, `gemini`, or `auto`.
- If the selected provider fails and another provider is configured, the fallback path is visible in `/debug`.
- If no keys are configured, demo mode is explicit rather than silent.

## Channel Automation Phase

- Keep publish adapters dry-run/export-first until `/debug` shows stable successful campaign runs.
- `GET /api/publish-logs` stores channel, payload preview, error, retryability, response preview, and the next operational fix.
- `POST /api/publish-logs/{publish_log_id}/retry` retries the stored publish payload after credentials/rate limits are fixed.
- Telegram and Bluesky publishing log provider-level response IDs when live credentials are configured.

## Test Phase

- Backend contract tests verify `/health`, `/ready`, `/debug`, and run creation.
- Playwright smoke tests verify that the dashboard renders and exposes the primary action.
