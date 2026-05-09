# PR: Add Social PR Autopilot Phase 2 Local Runtime And Channel Automation

## Summary

This PR adds the Social PR Autopilot full-stack app and upgrades it into a locally runnable, Mistral-powered, GCP-ready campaign automation system.

## What Changed

- Added a FastAPI backend for campaign generation, readiness, debug snapshots, run history, channel diagnostics, publishing, publish logs, and retries.
- Added a Next.js/Tailwind dashboard for generating launch campaigns and triggering Instagram export, Telegram dry-run, and Bluesky dry-run actions.
- Added Mistral-first local AI configuration with support for the existing `MISTRAL_KEY` env var and canonical `MISTRAL_API_KEY` for GCP.
- Added Gemini fallback/switching support for later GCP/provider changes.
- Added Instagram scheduling export, Telegram Bot API, and Bluesky AT Protocol adapter scaffolding.
- Added publish logs with retry state, missing config, response previews, rate-limit state, and next-action diagnostics.
- Added structured backend logging with request IDs, run IDs, publish log IDs, channel names, and campaign names.
- Added Dockerfiles, Compose config, GCP Cloud Run/Scheduler templates, and deployment docs.
- Added backend contract tests and Playwright UI smoke tests.
- Added documentation for phases, debugging, automation, and the full upgrade summary.

## Validation

- Backend tests: `5 passed`
- Backend compile check: passed
- Mistral live smoke test: passed
- Local `/api/campaign` generation through Mistral: passed
- Frontend build: passed
- Playwright dashboard smoke test: `1 passed`

## Notes

- The app currently stores runs and publish logs in memory for local development.
- Instagram direct publishing remains intentionally out of scope until business account, Facebook page, long-lived token, media container, and permission-review requirements are confirmed.
- `npm audit` flags Next/PostCSS advisories; the suggested automated fix upgrades to Next 16 and should be handled as a separate compatibility pass.
