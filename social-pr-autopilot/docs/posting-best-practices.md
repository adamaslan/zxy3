# Instagram Posting Best Practices

Created: 2026-05-12
Covers: image prep, caption writing, the local publish loop, and what breaks.

---

## The Publish Pipeline (How It Actually Works)

```
Your image file
  → frontend/public/          (drop it here)
  → backend /media/<file>     (served by FastAPI StaticFiles)
  → cloudflared tunnel        (makes it public HTTPS)
  → Meta POST /media          (container creation)
  → Meta poll status_code     (wait for FINISHED)
  → Meta POST /media_publish  (live on Instagram)
  → publish log               (status, media_id, next_action)
```

Every step above can fail independently. The sections below prevent each failure.

---

## Image Best Practices

### Supported Formats

| Format | What happens |
|---|---|
| `.jpg` / `.jpeg` already in `frontend/public/` | Used directly, no conversion |
| `.png`, `.webp`, `.heic`, or any other format | Auto-converted to JPEG by the backend via Pillow |

Meta only accepts JPEG for image posts. The backend handles conversion automatically — you do not need to pre-convert.

### Aspect Ratio — The Most Common Failure

Meta rejects images outside the range **4:5 (portrait) to 1.91:1 (landscape)**.

```
Too tall   → ratio < 0.8   → REJECTED  (e.g. phone portrait photo uncropped)
OK range   → 0.8 to 1.91  → ACCEPTED
Too wide   → ratio > 1.91  → REJECTED  (e.g. ultrawide screenshot)
```

**Ideal ratios for reach:**

| Format | Ratio | Pixels | Why |
|---|---|---|---|
| Square | 1:1 | 1080×1080 | Safest, works everywhere |
| Portrait | 4:5 | 1080×1350 | Most feed real estate, highest engagement |
| Landscape | 1.91:1 | 1080×566 | Good for wide shots, less feed space |

**Current images in `frontend/public/`:**

| File | Dimensions | Ratio | Meta OK? | Notes |
|---|---|---|---|---|
| `image-2-8-25.jpg` | 1800×1084 | 1.66 | Yes | Landscape — used in first post |
| `P1000937.JPG` | 3648×2736 | 1.33 | Yes | Large file (4.6 MB) — watch 8 MB limit |
| `Screenshot 2026-05-11 at 12.23.11 PM.png` | 600×572 | 1.05 | Yes | Auto-converts to JPEG |
| `IMAG0096.jpg` | 1952×3264 | 0.60 | **No** | Too tall — crop before posting |

To fix `IMAG0096.jpg`, crop it to at least 4:5 (1952×2440) before dropping it in `frontend/public/`.

### File Size

- **Hard limit: 8 MB.** The backend does not currently resize — if `P1000937.JPG` (4.6 MB) causes issues at Meta, compress it first.
- Target: under 2 MB for fast container creation and reliable Meta fetching.
- Quick compression from Terminal:
  ```bash
  sips -Z 1080 "P1000937.JPG" --out "frontend/public/P1000937-web.jpg"
  ```
  `-Z 1080` scales the longest edge to 1080px, which is Instagram's display resolution anyway.

### Filename Rules

- **No spaces, no special characters, no Unicode.** The narrow no-break space (` `) in iPhone screenshot names breaks path lookup silently.
- Use `kebab-case` or `snake_case`: `product-launch-hero.jpg`, `dashboard_screenshot.jpg`.
- Keep it under 40 characters.

**Before dropping a file in `frontend/public/`, rename it:**
```bash
# Bad:  "Image 2-8-25 at 6.37 PM.jpg"   ← has Unicode space, will fail
# Good: image-2-8-25.jpg
```

Quick rename from Terminal:
```bash
cd social-pr-autopilot/frontend/public
mv "My Image File.jpg" my-image-file.jpg
```

### Resolution

- Minimum width: **320px** (Meta will reject below this)
- Recommended: **1080px wide** (this is what Instagram actually displays at)
- No maximum resolution — but larger files take longer for Meta to fetch from the tunnel

---

## Caption Best Practices

### Hard Limits

| Field | Limit | What happens if exceeded |
|---|---|---|
| `text` (caption) | 2,200 characters | Backend truncates to 2,200 before sending |
| `alt_text` | 1,000 characters | Backend truncates to 1,000 before sending |
| Hashtags | 30 per post | Meta silently ignores extras |

### Caption Structure That Works

```
[Hook — first line, no hashtags]
[1-3 lines of context or story]
[CTA — one clear action]

[Line break]
[Hashtags — 5 to 15 is the current sweet spot]
```

Example:
```
Built this in a weekend. Now it posts to Instagram automatically.

Social PR Autopilot generates captions, validates images, and publishes
directly via the Graph API — no browser needed.

Drop a file in /public and run one curl command.

#buildinpublic #b2bsaas #tastytechbytes #automation #indiehacker
```

### What to Avoid in Captions

- Broken URLs — Instagram does not make links in captions clickable (only the bio link works)
- Emoji in the first line if targeting professional audiences — splits reach
- More than 15 hashtags — engagement drops above this threshold
- Hashtags mid-sentence — put them all at the end or in a comment

### Alt Text

Always supply `alt_text`. It improves accessibility and is indexed by Meta:

```json
"alt_text": "Dashboard screenshot showing automated Instagram campaign generation and one-click publish."
```

Keep it descriptive and factual. Under 125 characters is best for screen readers even though the limit is 1,000.

---

## Local Session Checklist

Run this before every posting session. Takes 60 seconds.

### 1. Start the tunnel (new URL each session)

```bash
cloudflared tunnel --url http://127.0.0.1:8102 --no-autoupdate 2>&1 | grep trycloudflare
```

Copy the `https://xxxx.trycloudflare.com` URL.

### 2. Update `.env`

```bash
# In /Users/adamaslan/code/zxy3/.env
INSTAGRAM_PUBLIC_BASE_URL=https://xxxx.trycloudflare.com
```

### 3. Start (or restart) the backend

```bash
cd social-pr-autopilot/backend
python3 -m uvicorn app.main:app --port 8102
```

### 4. Confirm diagnostics are clean

```bash
curl -s http://127.0.0.1:8102/api/channels/instagram/diagnostics | python3 -m json.tool
```

All green means:
- `"mode": "direct_publish"`
- `"missing_config": []`
- `"public_base_url"` shows your tunnel URL (not empty)
- `"token_expires_in_days"` is above 7

### 5. Drop your image in `frontend/public/`

Checklist before dropping:
- [ ] Filename is kebab-case, no spaces or Unicode
- [ ] Aspect ratio is between 0.8 and 1.91
- [ ] File size is under 8 MB (ideally under 2 MB)
- [ ] Format is JPEG or PNG (other formats auto-convert)

### 6. Fire the post

```bash
curl -s -X POST http://127.0.0.1:8102/api/publish \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "instagram",
    "campaign_name": "Your Campaign Name",
    "text": "Your caption here. #hashtag1 #hashtag2",
    "local_image_path": "your-image.jpg",
    "alt_text": "Describe the image for accessibility.",
    "dry_run": false
  }'
```

### 7. Confirm the result

Look for `"status": "published"` and an `external_id` (the IG media ID).

```bash
curl -s http://127.0.0.1:8102/api/publish-logs | python3 -m json.tool
```

Then check the profile: https://www.instagram.com/tastytechbytes/

---

## Common Failures and Fixes

| Error | Cause | Fix |
|---|---|---|
| `Image not found` | Filename has Unicode spaces or wrong path | Rename to kebab-case, no special chars |
| `Aspect ratio X.XX is outside Meta's range` | Image too tall or too wide | Crop to 4:5–1.91:1 before posting |
| `INSTAGRAM_PUBLIC_BASE_URL is not set` | Tunnel not started or `.env` not updated | Start cloudflared, update `.env`, restart backend |
| `media_url not publicly reachable` | Tunnel expired or backend not running | Restart cloudflared, get new URL, update `.env` |
| `No container id in response` | Wrong IG account ID or missing `instagram_content_publish` scope | Check `INSTAGRAM_BUSINESS_ACCOUNT_ID` and token scopes |
| `Media container failed with status: ERROR` | Meta rejected the image (size, format, dimensions) | Confirm JPEG, under 8 MB, ratio 0.8–1.91 |
| `Media container failed with status: EXPIRED` | Publish step took more than 24 hours after container creation | Create a new post — expired containers cannot be retried |
| `Requires instagram_content_publish permission` | Token is missing the publish scope | Regenerate token with `instagram_content_publish` checked in Graph API Explorer |
| `token_warning: Token expires in less than 7 days` | Long-lived token nearing 60-day expiry | Run the token exchange curl in `direct-posting-step-by-step.md` Step 2 |
| Post goes through but `status: failed` in log | Exception after publish, parsing error | Check `error` field in the publish log; the post may still have gone live on Instagram |
| `"status": "exported"` instead of `"published"` | `INSTAGRAM_DIRECT_PUBLISH_ENABLED` is `false` | Set it to `true` in `.env` and restart backend |

---

## Tunnel URL Changes Every Session

The cloudflared free tunnel gives a new URL each time. This is the main friction point of the local setup.

**Faster `.env` update one-liner** — add this to your shell profile:

```bash
function ig-tunnel() {
  URL=$(cloudflared tunnel --url http://127.0.0.1:8102 --no-autoupdate 2>&1 | grep -o 'https://[^ ]*trycloudflare.com' | head -1)
  echo "Tunnel: $URL"
  sed -i '' "s|INSTAGRAM_PUBLIC_BASE_URL=.*|INSTAGRAM_PUBLIC_BASE_URL=$URL|" /Users/adamaslan/code/zxy3/.env
  echo ".env updated"
}
```

Then each session is just:
```bash
ig-tunnel   # starts tunnel + updates .env automatically
```

Then restart the backend and you're ready to post.

---

## Cloud Path (Removes All of This Friction)

When the backend moves to Cloud Run, `INSTAGRAM_PUBLIC_BASE_URL` becomes the stable Cloud Run URL and the tunnel goes away entirely. Images in `frontend/public/` get replaced by a GCS bucket with public read access. The posting curl stays identical — only the image source changes.

That's covered in [instagram-graph-api-priority-plan-v2.md](instagram-graph-api-priority-plan-v2.md) Phase 2.
