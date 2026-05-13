# Instagram Posting Pipeline — Full Summary

Created: 2026-05-13

Everything that runs when you post to @tastytechbytes, from operator input to live Instagram post.

---

## Pipeline Overview

```
Operator input (curl / dashboard)
        │
        ▼
POST /api/publish                          main.py
        │
        ▼
rate limit check                           runtime.py  check_rate_limit()
        │
        ▼
publish log created                        runtime.py  create_publish_log()
        │
        ▼
feature flag check                         channel_adapters.py  INSTAGRAM_DIRECT_PUBLISH_ENABLED
        │
   ┌────┴──────────────────────┐
   │ false / dry_run           │ true + dry_run=false
   ▼                           ▼
scheduling export          _publish_instagram()          channel_adapters.py
status: exported               │
                               ├── _resolve_instagram_media_url()
                               │       local_image_path → media.py → JPEG in frontend/public/
                               │       INSTAGRAM_PUBLIC_BASE_URL + /media/<file> = public URL
                               │
                               ├── _check_instagram_quota()
                               │       GET /<IG_ID>/content_publishing_limit
                               │       aborts if quota_usage >= 100
                               │
                               ├── POST /<IG_ID>/media           Meta Graph API
                               │       image_url, caption, alt_text → container_id
                               │
                               ├── poll GET /<container_id>?fields=status_code
                               │       wait FINISHED (max 10 × 6 s)
                               │       abort on ERROR or EXPIRED
                               │
                               └── POST /<IG_ID>/media_publish
                                       creation_id=container_id → media_id
                                       status: published
        │
        ▼
publish log updated                        runtime.py  update_publish_log()
        │
        ▼
PublishResult returned to caller
```

---

## Every File and What It Does

### `backend/app/models.py`

Defines the data shapes for the whole pipeline.

| Model | Purpose |
|---|---|
| `PublishRequest` | Input from the operator. Fields: `channel`, `text`, `campaign_name`, `local_image_path`, `media_url`, `alt_text`, `link_url`, `dry_run` |
| `PublishResult` | Response to the caller. Fields: `publish_log_id`, `status`, `external_id` (IG media ID), `error`, `next_action`, `diagnostics` |
| `ChannelAdapterStatus` | Snapshot of whether a channel is configured, what mode it's in, and what's missing |

`local_image_path` and `media_url` are the two ways to supply an image. `local_image_path` is a filename relative to `frontend/public/`. `media_url` is a pre-existing public HTTPS URL that skips local conversion entirely.

---

### `backend/app/media.py`

Handles everything about turning a local file into something Meta can fetch.

| Function | What it does |
|---|---|
| `local_path_to_public_jpeg(local_path)` | Takes a filename, resolves it inside `MEDIA_DIR`, rejects path traversal, converts non-JPEG to JPEG via Pillow, returns the output filename |
| `_validate_dimensions(img)` | Raises `ValueError` if aspect ratio is outside 0.8–1.91 (Meta's 4:5 to 1.91:1 range) |
| `media_dir()` | Returns `MEDIA_DIR` — used by `main.py` to mount the static file server |

`MEDIA_DIR` is set by the `MEDIA_STORAGE_PATH` env var. Falls back to `frontend/public/` relative to the repo root for local development. Set it to a mounted GCS FUSE path or volume path on Cloud Run.

Security: absolute paths and `../` sequences are rejected by the `is_relative_to(MEDIA_DIR)` guard before any file is opened.

---

### `backend/app/main.py`

The FastAPI app. Mounts routes and wires everything together.

| Route | Method | What it does |
|---|---|---|
| `/health` | GET | Liveness check |
| `/ready` | GET | Readiness check with uptime and AI provider status |
| `/api/channels` | GET | Returns status of all three channel adapters |
| `/api/channels/{channel}/diagnostics` | GET | Instagram: mode, missing config, token expiry, tunnel URL, media dir |
| `/api/publish` | POST | Main publish entry point — accepts `PublishRequest`, returns `PublishResult` |
| `/api/publish-logs` | GET | Lists last 50 publish attempts with status and diagnostics |
| `/api/publish-logs/{id}/retry` | POST | Replays a previous publish attempt |
| `/api/media/prepare` | POST | Converts a local file to JPEG, returns the public URL for manual use |
| `/media/<filename>` | GET | Static file serving — Meta fetches the image from here via the tunnel |

`/media` is a `StaticFiles` mount pointed at `MEDIA_DIR`. It is what the Cloudflare tunnel exposes to Meta.

---

### `backend/app/channel_adapters.py`

The core publish logic. All Instagram-specific functions live here.

| Function | What it does |
|---|---|
| `publish(payload)` | Top-level dispatcher: checks rate limit, creates log, routes to export or `_publish_instagram()` |
| `_instagram_direct_enabled()` | Reads `INSTAGRAM_DIRECT_PUBLISH_ENABLED` — gates the live path |
| `_resolve_instagram_media_url(payload)` | Returns a public HTTPS URL: uses `media_url` if set, otherwise converts `local_image_path` via `media.py` and prepends `INSTAGRAM_PUBLIC_BASE_URL` |
| `_check_instagram_quota()` | Calls `GET /<IG_ID>/content_publishing_limit` — aborts if at 100 posts in 24 h |
| `_publish_instagram(payload)` | The three-step Meta sequence: create container → poll FINISHED → publish. Returns the IG media ID |
| `_instagram_export_id(payload)` | Fallback path — generates an export ID when direct publish is off |
| `adapter_diagnostics(channel)` | Returns channel state including token expiry days, tunnel URL, media dir |
| `_status(channel)` | Builds `ChannelAdapterStatus` — reflects live mode vs export mode based on the flag |

---

### `backend/app/runtime.py`

In-memory state store and event log. Shared across all channels.

| Symbol | What it stores | Cap |
|---|---|---|
| `RUNS` | Campaign generation runs | 500 (evicts oldest) |
| `PUBLISH_LOGS` | Every publish attempt with full diagnostics | 500 (evicts oldest) |
| `EVENTS` | Structured log of all internal events | 200 (ring buffer) |
| `CHANNEL_ATTEMPTS` | Per-channel timestamps for rate limiting | Rolling window, cleaned on each check |

Key functions: `create_publish_log()`, `update_publish_log()`, `check_rate_limit()`, `record_event()`.

All caps are configurable via `MAX_RUNS`, `MAX_PUBLISH_LOGS`, `MAX_DEBUG_EVENTS` env vars.

---

### `frontend/public/` — The Media Directory

Files dropped here are immediately servable at `http://127.0.0.1:8102/media/<filename>` and, via the tunnel, at `https://<tunnel-url>/media/<filename>`.

| File | Ratio | Meta OK? |
|---|---|---|
| `image-2-8-25.jpg` | 1.66 | Yes — used for first live post |
| `P1000937.JPG` | 1.33 | Yes — 4.6 MB, close to 8 MB limit |
| `Screenshot 2026-05-11 at 12.23.11 PM.png` | 1.05 | Yes — auto-converts to JPEG |
| `IMAG0096.jpg` | 0.60 | **No** — too tall, needs cropping to 4:5 before use |

---

## Environment Variables

| Variable | Required | What it controls |
|---|---|---|
| `INSTAGRAM_DIRECT_PUBLISH_ENABLED` | Yes | `true` = live post, `false` = scheduling export |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Yes | The IG User ID (`17841461949239065`) |
| `INSTAGRAM_FACEBOOK_PAGE_ID` | Yes | The connected FB Page ID (`1066302923238795`) |
| `INSTAGRAM_ACCESS_TOKEN` | Yes | Long-lived 60-day user token with `instagram_content_publish` |
| `INSTAGRAM_TOKEN_EXPIRES_AT` | Yes | Unix timestamp — surfaced in diagnostics as days remaining |
| `INSTAGRAM_PUBLIC_BASE_URL` | Yes (local) | Cloudflare tunnel URL — changes each session |
| `INSTAGRAM_GRAPH_API_VERSION` | No | Defaults to `v25.0` |
| `INSTAGRAM_RATE_LIMIT` | No | Defaults to `100/86400` (Meta's ceiling) |
| `MEDIA_STORAGE_PATH` | No | Override media dir for Docker/Cloud Run |
| `APP_SECRET` | Yes | ttb1 Meta app secret — used for token exchange/debug |
| `APP_ID` | Yes | ttb1 Meta app ID (`978114384713198`) |

---

## The Three Meta API Calls (In Order)

```
POST https://graph.facebook.com/v25.0/<IG_ID>/media
  ?image_url=<tunnel_url>/media/<filename>
  &caption=<text truncated to 2200 chars>
  &alt_text=<text truncated to 1000 chars>
  &access_token=<long-lived token>
  → { "id": "<container_id>" }

GET https://graph.facebook.com/v25.0/<container_id>
  ?fields=status_code
  &access_token=<token>
  → { "status_code": "FINISHED" }   ← poll until this

POST https://graph.facebook.com/v25.0/<IG_ID>/media_publish
  ?creation_id=<container_id>
  &access_token=<token>
  → { "id": "<media_id>" }          ← this is the live IG post ID
```

Containers expire after 24 hours. An account can hold up to 400 unpublished containers. The quota ceiling is 100 published posts per rolling 24-hour window.

---

## Local Session Startup Sequence

```bash
# 1. Start the Cloudflare tunnel (new URL each session)
cloudflared tunnel --url http://127.0.0.1:8102 --no-autoupdate 2>&1 | grep trycloudflare

# 2. Update INSTAGRAM_PUBLIC_BASE_URL in .env with the printed URL

# 3. Start the backend
cd social-pr-autopilot/backend
python3 -m uvicorn app.main:app --port 8102

# 4. Confirm everything is green
curl -s http://127.0.0.1:8102/api/channels/instagram/diagnostics | python3 -m json.tool

# 5. Post
curl -s -X POST http://127.0.0.1:8102/api/publish \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "instagram",
    "campaign_name": "My Campaign",
    "text": "Caption here. #tastytechbytes",
    "local_image_path": "image-2-8-25.jpg",
    "alt_text": "Description for accessibility.",
    "dry_run": false
  }'
```

---

## Status Values in Publish Logs

| Status | Meaning |
|---|---|
| `pending` | Log created, publish not yet attempted |
| `exported` | Flag is off — scheduling export record created, no API call made |
| `dry_run` | `dry_run=true` was set — no API call made |
| `published` | All three Meta API calls succeeded — `external_id` is the live IG media ID |
| `failed` | An exception was raised — `error` and `next_action` explain what to fix |
| `rate_limited` | Local rate limit hit before any API call was attempted |

---

## Docs in This Repo

| File | What it covers |
|---|---|
| [direct-posting-step-by-step.md](direct-posting-step-by-step.md) | Code-level guide from zero credentials to first live post |
| [posting-best-practices.md](posting-best-practices.md) | Image prep rules, caption limits, session checklist, `ig-tunnel` shell helper |
| [instagram-graph-api-priority-plan-v2.md](instagram-graph-api-priority-plan-v2.md) | Updated Meta API plan with current constraints and both login paths |
| [connect-instagram-account.md](connect-instagram-account.md) | Account setup — Facebook Page, Instagram Business Account, token discovery |
| [vscode-instagram-tooling-evaluation.md](vscode-instagram-tooling-evaluation.md) | Why CLI tools and Composio were not used |
