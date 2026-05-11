# Phase 2 - Channel Adapters

## Goal

Add real publishing and scheduling adapters while keeping approvals configurable.

## Scope

- Telegram bot adapter: implemented behind `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, dry-run by default.
- Bluesky AT Protocol adapter: implemented behind `BLUESKY_HANDLE` + `BLUESKY_APP_PASSWORD`, dry-run by default.
- Instagram scheduling export: implemented as a scheduling payload/export record, not direct posting.
- Per-channel rate limits: implemented through env vars such as `TELEGRAM_RATE_LIMIT=20/3600`.
- Publish logs and retry state: implemented through `/api/publish-logs` and `/api/publish-logs/{id}/retry`.
- Troubleshooting diagnostics: publish logs include protocol, required config, missing config, response preview, retryability, and next action.
- Business-account readiness: Instagram export logs track required business account/page/token fields for moving from export mode to direct publishing later.
- Adapter status: implemented through `/api/channels`.
- Adapter diagnostics: implemented through `/api/channels/{channel}/diagnostics`.

Out of scope for this pass:

- X draft queue.
- Direct Instagram Graph API publishing.
- Persistent database storage for publish logs; current logs are in-memory.
- OAuth setup screens.

## Publish Log Debug Fields

Each publish log is designed to make real channel issues easier to fix:

- `channel`: `instagram`, `telegram`, or `bluesky`.
- `status`: `pending`, `dry_run`, `exported`, `published`, `failed`, or `rate_limited`.
- `diagnostics.protocol`: the protocol/path used by the adapter.
- `diagnostics.required_config`: environment variables or credentials needed for live publishing.
- `diagnostics.missing_config`: missing credentials/configuration.
- `retryable`: whether retrying makes sense after fixing config/rate limits.
- `next_action`: the specific operational fix to try next.
- `response_preview`: platform error or response detail, truncated for safe logging.

For Instagram business-account publishing, the current implementation intentionally uses scheduling export first. Direct publishing should only be added after the app has confirmed business account ID, connected Facebook page ID, long-lived access token, media-container creation, publish endpoint behavior, and permission review status. Use [Connect An Instagram Account](./connect-instagram-account.md) to prepare the account and collect the required IDs/tokens.

## Success Criteria

- Low-risk channels can autopublish when credentials are configured and `dry_run=false`.
- Higher-risk channels can stay draft-only or export-only.
- Failed publishes preserve payload preview and error detail.
- The dashboard can dry-run/export Instagram, Telegram, and Bluesky actions after campaign generation.
