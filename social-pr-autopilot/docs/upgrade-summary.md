# Social PR Autopilot Upgrade Summary

## Overview

Social PR Autopilot has moved from a concept scaffold into a locally runnable full-stack app with a clear path to GCP. The current version can generate launch campaign packs with Mistral, expose channel adapter diagnostics, prepare Instagram scheduling exports, dry-run or publish through Telegram and Bluesky when credentials are configured, and preserve publish logs that explain what failed and how to fix it.

## Major Upgrades

- Added a FastAPI backend with health, readiness, debugging, campaign generation, channel diagnostics, publish, publish-log, and retry endpoints.
- Added a Next.js and Tailwind dashboard for entering a launch brief, generating a campaign, and triggering Instagram, Telegram, and Bluesky actions.
- Added Mistral-first local AI provider configuration with Gemini fallback/switching support.
- Added root `.env` loading for local development, including support for the existing `MISTRAL_KEY` alias.
- Added GCP-ready canonical env names such as `MISTRAL_API_KEY`, `GEMINI_API_KEY`, channel credentials, and deployment mode flags.
- Added structured JSON backend logging with request IDs, durations, run IDs, channel names, publish log IDs, and campaign names.
- Added in-memory run tracking and debug snapshots for local troubleshooting.
- Added in-memory publish logs with status, retryability, required config, missing config, response previews, next actions, and payload previews.
- Added retry support for stored publish attempts through `/api/publish-logs/{publish_log_id}/retry`.
- Added JSON-backed publish payload storage so retry state is not tied to Python-specific string representations.
- Added per-channel rate-limit settings through env vars such as `TELEGRAM_RATE_LIMIT=20/3600`.
- Added safe fallback behavior for malformed retry/count env vars and guarded AI provider response parsing.
- Added strict TypeScript typing for the dashboard campaign, provider, channel, debug, and publish-result shapes.
- Added backend tests that verify health, readiness, campaign creation, Mistral key aliasing, invalid env fallback, channel diagnostics, dry-run publishing, publish-log retry, and Instagram export behavior.
- Added Playwright smoke testing for the dashboard.
- Added Dockerfiles, Compose config, Cloud Run template, Cloud Scheduler template, and deployment notes.
- Added Docker ignore files and root ignore rules so dependency/build artifacts stay out of PRs and images.

## AI Provider Behavior

Local development now defaults to Mistral:

- `AI_PROVIDER=mistral`
- `MISTRAL_KEY` works locally.
- `MISTRAL_API_KEY` is the preferred GCP/Cloud Run secret name.
- `GEMINI_API_KEY` remains available as a fallback or future primary provider.
- `AI_PROVIDER=auto` uses Mistral first locally and can prefer Gemini on GCP.
- `AI_PROVIDER=demo` keeps tests deterministic and avoids external API calls.

The `/ready` endpoint reports the selected provider, provider order, configured providers, key source, model names, loaded env files, app env, and deploy target.

## Channel Automation

Phase 2 now focuses on Instagram, Telegram, and Bluesky:

- Instagram creates a scheduling export payload for Meta Business Suite and records the business-account fields needed before direct Graph API publishing.
- Telegram supports dry-run by default and live `sendMessage` publishing when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured.
- Bluesky supports dry-run by default and live AT Protocol posting when `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` are configured.
- Every channel exposes diagnostics through `/api/channels` and `/api/channels/{channel}/diagnostics`.

## Debugging And Reliability

The app now has a practical troubleshooting loop for real publishing issues:

- `/debug` shows recent events, run counts, run status counts, and publish log counts.
- `/api/runs` and `/api/runs/{run_id}` show campaign-generation history.
- `/api/publish-logs` shows each publish attempt and why it succeeded, failed, exported, dry-ran, or hit a rate limit.
- Failed channel operations include a retryable flag, truncated platform response/error preview, and a concrete next action.
- Logs include enough IDs to connect frontend actions, backend requests, AI calls, and channel publish attempts.

## Local Run Status

The app currently runs locally with:

- Frontend: `http://127.0.0.1:3102`
- Backend: `http://127.0.0.1:8102`

Validated locally:

- Backend contract tests pass.
- Backend compile check passes.
- Mistral live smoke test succeeds.
- `/api/campaign` generates campaign content through Mistral.
- Frontend production build passes.
- Playwright dashboard smoke test passes.

## GCP Migration Shape

The app is ready to migrate without changing application code:

- Move secrets into GCP Secret Manager.
- Deploy the backend Dockerfile to Cloud Run.
- Set `APP_ENV=production`, `DEPLOY_TARGET=gcp`, `AI_PROVIDER=mistral`, and production `ALLOWED_ORIGINS`.
- Build the frontend with `NEXT_PUBLIC_API_BASE` set to the backend Cloud Run URL.
- Use the included Cloud Run and Cloud Scheduler templates as starting points.

## Known Follow-Ups

- Persist runs and publish logs in a database instead of in-memory storage.
- Add direct Instagram Graph API publishing after confirming business account ID, connected Facebook page ID, long-lived token, media container behavior, and permission review status.
- Add OAuth/setup screens for channel credentials.
- Add image generation and media upload paths for Instagram and Bluesky.
- Upgrade Next/PostCSS after planning for the breaking Next 16 jump flagged by `npm audit fix --force`.
