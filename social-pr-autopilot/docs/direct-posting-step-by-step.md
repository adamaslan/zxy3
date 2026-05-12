# Step-by-Step: Enable Direct Instagram Posting

Created: 2026-05-11

This is a precise, code-level guide to moving Social PR Autopilot from its current `scheduling_export` mode to live direct posting on Instagram. Every step maps to actual files in this repo.

---

## Where Things Stand Right Now

**What exists:**

- `channel_adapters.py` has an `_instagram_export_id()` function — all Instagram publish calls hit this and return `status: exported`. There is no Graph API call.
- `models.py` `PublishRequest` has `image_prompt` (string or None) but no `media_url` or `alt_text`.
- `_status("instagram")` hard-codes `supports_autopublish: False` and `mode: scheduling_export`.
- `config.py` loads `.env` from the workspace root. The Instagram env vars (`INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_FACEBOOK_PAGE_ID`) are read for diagnostics but never used for an API call.
- The feature flag `INSTAGRAM_DIRECT_PUBLISH_ENABLED` does not exist anywhere in the codebase yet.

**What is needed to reach a live post:**

1. Credentials verified and stored in `.env`.
2. `PublishRequest` model extended with `media_url` and `alt_text`.
3. Pre-publish image validation function.
4. Quota check against `content_publishing_limit` before every post.
5. `_publish_instagram()` async function that calls `POST /media` → poll status → `POST /media_publish`.
6. Feature flag that gates the live path.
7. `_status()` and adapter diagnostics updated to reflect the new mode when the flag is on.
8. Token expiry tracking.
9. One manual test with a real image before any automation runs.

---

## Step 1 — Verify Credentials In Graph API Explorer

Before touching any code, confirm the three required IDs are real and working.

In Graph API Explorer (`https://developers.facebook.com/tools/explorer/`):

```
GET /me/accounts?fields=id,name,access_token
```

If `access_token` appears in the response for your Page, your Facebook user has a Page role. Copy the Page `id`.

```
GET /<PAGE_ID>?fields=instagram_business_account,connected_instagram_account
```

Copy `instagram_business_account.id`. That is your `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

```
GET /<INSTAGRAM_BUSINESS_ACCOUNT_ID>/content_publishing_limit?fields=config,quota_usage
```

Confirm it returns a number for `quota_usage`. If this call fails with a permissions error, the account or token is not ready — do not proceed.

---

## Step 2 — Exchange For A Long-Lived Token

Short-lived tokens from Graph API Explorer expire in about an hour. Exchange before adding to `.env`:

```bash
curl "https://graph.facebook.com/v23.0/oauth/access_token\
?grant_type=fb_exchange_token\
&client_id=<META_APP_ID>\
&client_secret=<META_APP_SECRET>\
&fb_exchange_token=<SHORT_LIVED_TOKEN>"
```

The response includes `access_token` (60-day token) and `expires_in` (seconds). Calculate the Unix expiry timestamp:

```bash
echo $(($(date +%s) + <expires_in>))
```

---

## Step 3 — Add Env Vars To `.env`

The workspace root `.env` is the canonical location (`config.py` loads it first):

```bash
# Instagram Direct Publish
INSTAGRAM_DIRECT_PUBLISH_ENABLED=false        # keep false until Step 9
INSTAGRAM_BUSINESS_ACCOUNT_ID=<IG_USER_ID>
INSTAGRAM_FACEBOOK_PAGE_ID=<PAGE_ID>
INSTAGRAM_ACCESS_TOKEN=<LONG_LIVED_TOKEN>
INSTAGRAM_TOKEN_EXPIRES_AT=<UNIX_TIMESTAMP>   # from Step 2
INSTAGRAM_GRAPH_API_VERSION=v23.0
INSTAGRAM_RATE_LIMIT=100/86400               # Meta ceiling; lower if desired
```

Never commit this file. Restart the backend after saving:

```bash
cd social-pr-autopilot && make backend
```

Confirm diagnostics load the values:

```bash
curl http://127.0.0.1:8102/api/channels/instagram/diagnostics
```

`missing_config` should now be empty.

---

## Step 4 — Extend `PublishRequest` In `models.py`

Open [models.py](../backend/app/models.py). Add `media_url` and `alt_text` to `PublishRequest`:

```python
class PublishRequest(BaseModel):
    channel: Channel
    text: str
    campaign_name: str = Field(default="Untitled Campaign")
    image_prompt: str | None = None
    media_url: str | None = None          # add: public HTTPS image URL for Graph API
    alt_text: str | None = None           # add: image alt text, max 1000 chars
    link_url: str | None = None
    dry_run: bool = Field(default=True)
```

No other models need changing yet.

---

## Step 5 — Add Image Validation To `channel_adapters.py`

Open [channel_adapters.py](../backend/app/channel_adapters.py). Add this function near the top of the private helpers section (before `_publish_telegram`):

```python
def _validate_instagram_image(media_url: str, alt_text: str | None) -> None:
    """Raise ValueError if the media_url or alt_text fail Meta's constraints."""
    if not media_url.startswith("https://"):
        raise ValueError("media_url must be a public HTTPS URL")
    if alt_text and len(alt_text) > 1000:
        raise ValueError(f"alt_text exceeds 1000 chars ({len(alt_text)})")
    # HEAD request to confirm the URL is publicly reachable
    import httpx as _httpx
    try:
        r = _httpx.head(media_url, follow_redirects=True, timeout=10)
        r.raise_for_status()
    except _httpx.HTTPError as exc:
        raise ValueError(f"media_url not publicly reachable: {exc}") from exc
    content_type = r.headers.get("content-type", "")
    if "jpeg" not in content_type and "jpg" not in content_type:
        raise ValueError(f"media_url must serve JPEG content; got '{content_type}'")
```

Note: dimension and file-size validation requires downloading the image. Add that only if Meta starts rejecting posts for those reasons — the HEAD check is enough to catch private URLs and wrong content types before the API call.

---

## Step 6 — Add Quota Check To `channel_adapters.py`

Add this helper below `_validate_instagram_image`:

```python
async def _check_instagram_quota() -> None:
    """Raise RuntimeError if the Instagram account is at or above the 100-post daily limit."""
    ig_id = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    version = os.getenv("INSTAGRAM_GRAPH_API_VERSION", "v23.0")
    url = f"https://graph.facebook.com/{version}/{ig_id}/content_publishing_limit"
    response = await channel_client().get(
        url,
        params={"fields": "config,quota_usage", "access_token": token},
    )
    response.raise_for_status()
    data = response.json().get("data", [{}])[0]
    quota_usage = data.get("quota_usage", 0)
    config_limit = data.get("config", {}).get("quota_total", 100)
    if quota_usage >= config_limit:
        raise RuntimeError(
            f"Instagram daily quota reached: {quota_usage}/{config_limit} posts in the last 24 hours"
        )
```

---

## Step 7 — Add `_publish_instagram()` To `channel_adapters.py`

Add this full function below `_check_instagram_quota`:

```python
async def _publish_instagram(payload: PublishRequest) -> str:
    """Create a media container, poll until FINISHED, then publish. Returns the IG media ID."""
    ig_id = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    version = os.getenv("INSTAGRAM_GRAPH_API_VERSION", "v23.0")
    base = f"https://graph.facebook.com/{version}"

    if not ig_id or not token:
        raise RuntimeError("INSTAGRAM_BUSINESS_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN are required")
    if not payload.media_url:
        raise RuntimeError("media_url is required for direct Instagram publishing")

    _validate_instagram_image(payload.media_url, payload.alt_text)
    await _check_instagram_quota()

    # Step A: create media container
    container_params: dict[str, str] = {
        "image_url": payload.media_url,
        "caption": payload.text[:2200],
        "access_token": token,
    }
    if payload.alt_text:
        container_params["alt_text"] = payload.alt_text[:1000]

    container_response = await channel_client().post(
        f"{base}/{ig_id}/media",
        params=container_params,
    )
    container_response.raise_for_status()
    container_id = container_response.json().get("id")
    if not container_id:
        raise RuntimeError(f"No container id in response: {container_response.text}")

    # Step B: poll container status (max 10 attempts, 6 s apart = 60 s window)
    for _ in range(10):
        status_response = await channel_client().get(
            f"{base}/{container_id}",
            params={"fields": "status_code", "access_token": token},
        )
        status_response.raise_for_status()
        status_code = status_response.json().get("status_code", "")
        if status_code == "FINISHED":
            break
        if status_code in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Media container failed with status: {status_code}")
        await asyncio.sleep(6)
    else:
        raise RuntimeError("Media container did not reach FINISHED status within 60 seconds")

    # Step C: publish
    publish_response = await channel_client().post(
        f"{base}/{ig_id}/media_publish",
        params={"creation_id": container_id, "access_token": token},
    )
    publish_response.raise_for_status()
    media_id = publish_response.json().get("id", "")
    if not media_id:
        raise RuntimeError(f"No media id in publish response: {publish_response.text}")

    return media_id
```

Add `import asyncio` at the top of `channel_adapters.py` if it is not already there.

---

## Step 8 — Wire The Feature Flag Into `publish()` In `channel_adapters.py`

In the `publish()` function, replace the existing Instagram block:

```python
# BEFORE (lines 56-60)
if payload.channel == "instagram":
    external_id = _instagram_export_id(payload)
    next_action = "Upload/schedule this export in Meta Business Suite or connect Instagram Graph API credentials."
    update_publish_log(log["id"], "exported", external_id=external_id, next_action=next_action)
    return _result(payload, log["id"], "exported", limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)
```

Replace with:

```python
if payload.channel == "instagram":
    direct_enabled = os.getenv("INSTAGRAM_DIRECT_PUBLISH_ENABLED", "false").lower() not in {"0", "false", "no", "off"}
    if not direct_enabled or payload.dry_run:
        external_id = _instagram_export_id(payload)
        next_action = (
            "Set INSTAGRAM_DIRECT_PUBLISH_ENABLED=true and supply media_url to enable live posting."
            if not direct_enabled
            else "Dry run complete. Set dry_run=false to post live."
        )
        status = "dry_run" if payload.dry_run else "exported"
        update_publish_log(log["id"], status, external_id=external_id, next_action=next_action)
        return _result(payload, log["id"], status, limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)
    # direct publish path
    external_id = await _publish_instagram(payload)
    next_action = "Verify the post on the Instagram profile."
    update_publish_log(log["id"], "published", external_id=external_id, next_action=next_action)
    return _result(payload, log["id"], "published", limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)
```

---

## Step 9 — Update `_status("instagram")` To Reflect The Flag

In `_status()`, replace the `"instagram"` config dict entry:

```python
"instagram": {
    "protocol": (
        "Instagram Graph API direct publish"
        if os.getenv("INSTAGRAM_DIRECT_PUBLISH_ENABLED", "false").lower() not in {"0", "false", "no", "off"}
        else "Meta Business Suite export now; Instagram Graph API credentials reserved for direct publish"
    ),
    "required": ["INSTAGRAM_BUSINESS_ACCOUNT_ID", "INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_FACEBOOK_PAGE_ID"],
    "mode": (
        "direct_publish"
        if os.getenv("INSTAGRAM_DIRECT_PUBLISH_ENABLED", "false").lower() not in {"0", "false", "no", "off"}
        else "scheduling_export"
    ),
    "supports_autopublish": os.getenv("INSTAGRAM_DIRECT_PUBLISH_ENABLED", "false").lower() not in {"0", "false", "no", "off"},
    "next_action": "Set INSTAGRAM_DIRECT_PUBLISH_ENABLED=true and supply media_url to enable direct posting.",
},
```

---

## Step 10 — Add Token Expiry Warning To Diagnostics

In `adapter_diagnostics()`, after the base dict is built, add an expiry check for Instagram:

```python
def adapter_diagnostics(channel: str) -> dict[str, Any]:
    status = _status(channel)
    result = {
        "channel": channel,
        "protocol": status.protocol,
        "configured": status.configured,
        "mode": status.mode,
        "required_config": status.required_config,
        "missing_config": status.missing_config,
        "rate_limit": status.rate_limit,
        "supports_autopublish": status.supports_autopublish,
        "next_action": status.next_action,
    }
    if channel == "instagram":
        expires_at = os.getenv("INSTAGRAM_TOKEN_EXPIRES_AT", "")
        if expires_at:
            import time as _time
            seconds_left = int(expires_at) - int(_time.time())
            result["token_expires_in_days"] = round(seconds_left / 86400, 1)
            if seconds_left < 7 * 86400:
                result["token_warning"] = "Token expires in less than 7 days — renew now."
    return result
```

---

## Step 11 — Test With `dry_run=true` And `media_url` First

Keep `INSTAGRAM_DIRECT_PUBLISH_ENABLED=false` in `.env`. Run a dry-run with a real public HTTPS JPEG URL to confirm validation passes:

```bash
curl -s -X POST http://127.0.0.1:8102/api/publish \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "instagram",
    "campaign_name": "Direct Publish Test",
    "text": "Test caption under 2200 chars. #test",
    "media_url": "https://your-public-cdn.example.com/approved-image.jpg",
    "alt_text": "Dashboard showing automated social campaign generation.",
    "dry_run": false
  }'
```

Expected response: `status: exported`, `next_action` mentions setting `INSTAGRAM_DIRECT_PUBLISH_ENABLED=true`. The `_validate_instagram_image` check still runs and will raise if the URL is private or not JPEG.

---

## Step 12 — Enable Direct Publish And Post Live

Only after Step 11 passes cleanly:

1. Change `.env`: `INSTAGRAM_DIRECT_PUBLISH_ENABLED=true`
2. Restart the backend.
3. Run the same curl from Step 11 (same `media_url`, same caption).
4. Watch the backend logs for container creation, status polling, and publish.
5. Check the Instagram profile — the post should appear within 30–60 seconds.
6. Inspect the publish log:

```bash
curl http://127.0.0.1:8102/api/publish-logs
```

Expected: `status: published`, `external_id` is the IG media ID.

---

## Step 13 — Add `instagram_content_publish` Permission For Non-Admin Users

The token generated in Graph API Explorer has access because your Facebook user is an app admin. For any other users (e.g., future customers), the Meta app needs `instagram_content_publish` approved via App Review.

Until then, only app admins, developers, and testers can trigger live posting. That is fine for a single-operator tool. When multi-tenant onboarding is needed:

1. Go to `developers.facebook.com/apps` → your app → App Review → Permissions and Features.
2. Request `instagram_content_publish` and `pages_read_engagement`.
3. Provide a screencast showing the exact posting flow.
4. Switch the app to Live Mode after approval.

Do not request App Review until Steps 1–12 are proven working end-to-end.

---

## Common Errors And Fixes

| Error | Cause | Fix |
|---|---|---|
| `media_url not publicly reachable` | URL requires auth, is localhost, or is a Netlify preview | Upload image to a public CDN or GCS bucket with a public URL |
| `media_url must serve JPEG content` | File is PNG, WebP, or the server returns a redirect to a non-image | Convert to JPEG; ensure the CDN serves `image/jpeg` content-type |
| `No container id in response` | Wrong IG account ID, expired token, missing `instagram_content_publish` scope | Check `INSTAGRAM_BUSINESS_ACCOUNT_ID`, refresh token, verify scope |
| `Media container failed with status: ERROR` | Meta rejected the image (bad dimensions, size, format) | Check image is JPEG, ≤ 8 MB, aspect ratio 4:5 to 1.91:1 |
| `Media container failed with status: EXPIRED` | Container was not published within 24 hours | Do not retry the old container; create a new one |
| `Instagram daily quota reached` | 100 posts in the last 24 hours | Wait for the 24-hour window to reset; check `quota_usage` again |
| `401 Unauthorized` | Token expired or revoked | Re-run Step 2 to get a fresh long-lived token |
| `token_warning: Token expires in less than 7 days` | Long-lived token nearing expiry | Exchange now: same curl as Step 2 using the current long-lived token as `fb_exchange_token` |
| Post appears but `external_id` is empty | Publish succeeded but response parsing failed | Check `publish_response.json()` shape in logs; Meta returns `{"id": "..."}` |

---

## Files Changed Summary

| File | What changes |
|---|---|
| [models.py](../backend/app/models.py) | Add `media_url: str \| None` and `alt_text: str \| None` to `PublishRequest` |
| [channel_adapters.py](../backend/app/channel_adapters.py) | Add `import asyncio`; add `_validate_instagram_image()`, `_check_instagram_quota()`, `_publish_instagram()`; replace Instagram block in `publish()`; update `_status("instagram")`; update `adapter_diagnostics()` |
| `.env` (workspace root) | Add `INSTAGRAM_DIRECT_PUBLISH_ENABLED`, `INSTAGRAM_TOKEN_EXPIRES_AT`, `INSTAGRAM_GRAPH_API_VERSION` |

No frontend changes are required to enable direct posting — the dashboard's existing publish form already accepts `media_url` once the backend model supports it, or you can post via `curl` as shown above.
