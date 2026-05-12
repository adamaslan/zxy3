# Instagram Graph API Priority Plan v2

Last verified: 2026-05-11
Supersedes: [instagram-graph-api-priority-plan.md](instagram-graph-api-priority-plan.md) (kept for history; do not delete)

This is a refreshed plan that incorporates the latest Meta Instagram Platform documentation at https://developers.facebook.com/docs/. The main updates vs v1:

- Meta now documents **two co-equal API setups**: Instagram API with Instagram Login (IG-Login) and Instagram API with Facebook Login (FB-Login). The newer IG-Login path uses `instagram_business_*` scopes and does not require a connected Facebook Page.
- The old `instagram_basic` / `instagram_content_publish` style scopes were deprecated on **2025-01-27** for IG-Login apps. They still apply to the FB-Login path.
- Content publishing rate limit is now stated as **100 API-published posts per rolling 24 hours** per Instagram account (carousels count as one).
- Meta exposes `GET /<IG_ID>/content_publishing_limit` for live quota checks.
- `alt_text` became a supported request parameter on `POST /media` for image posts on **2025-03-24** (not Reels or Stories).
- Container objects **expire after 24 hours**; an Instagram account can hold **up to 400 unpublished containers** at a time.
- Resumable video uploads go through `https://rupload.facebook.com/ig-api-upload/<IG_MEDIA_CONTAINER_ID>` with `upload_type=resumable`.

The product should still treat direct Graph API publishing as the canonical end state, with Meta Business Suite scheduling export as the fallback for setup, outages, missing public URLs, App Review gates, and rate-limit windows.

## Positioning

Social PR Autopilot continues to prioritize the Instagram Graph API. The order of operations stays:

1. Connect and verify the Instagram account through the Graph API.
2. Keep local VSCode/Codex operation export-only until the API path is proven end-to-end.
3. Add direct Graph API publishing behind a feature flag.
4. Move credentials, media, and logs to cloud infrastructure.
5. Make direct publishing autonomous only after diagnostics, media validation, App Review, durable retry logs, and a kill switch are in place.

What is new in v2:

- The plan explicitly supports **either** IG-Login or FB-Login as the canonical readiness path. The choice depends on whether the operator wants to manage Instagram directly or through a connected Facebook Page.
- The publish adapter validates against the **current Meta media constraints** (JPEG image up to 8 MB, aspect ratio between 4:5 and 1.91:1, Reels MP4/MOV up to 300 MB / 3 s–15 min, Story video up to 100 MB / 3–60 s).
- The publish loop calls `content_publishing_limit` before every publish and refuses if the account is at quota.

## Choosing The Setup Path

| Question | Choose Instagram Login | Choose Facebook Login |
| --- | --- | --- |
| Is there a connected Facebook Page the operator owns? | Optional | Required |
| Does the operator already have Page Tasks (`MANAGE`, `CREATE_CONTENT`, `MODERATE`, `ADVERTISE`)? | Not required | Required |
| Does the workflow need ads, Business Manager assets, or Page-level engagement reads? | Not supported on IG-Login | Supported |
| Does the workflow need to manage Instagram without touching Facebook? | Best fit | Not ideal |
| Are old-style `instagram_basic`/`instagram_content_publish` scopes acceptable? | No (deprecated for IG-Login on 2025-01-27) | Yes (still used here) |

Recommended default for Social PR Autopilot: **start with Instagram Login** for new connections and offer Facebook Login as an alternate readiness path. Both should run through the same adapter interface; only the auth and discovery steps differ.

## Permissions Matrix (Current)

### Instagram API with Instagram Login

Discovery:

| Permission | Why |
| --- | --- |
| `instagram_business_basic` | Reads basic IG account/media info and is required for any IG-Login API access. |

Publishing (added later, before App Review):

| Permission | Why |
| --- | --- |
| `instagram_business_content_publish` | Required for `POST /media` and `POST /media_publish`. |
| `instagram_business_manage_comments` | Only if Social PR Autopilot will moderate comments. |
| `instagram_business_manage_messages` | Only if Social PR Autopilot will manage DMs. |

Tagging and ads are **not available** on this path.

### Instagram API with Facebook Login

Discovery:

| Permission | Why |
| --- | --- |
| `instagram_basic` | Reads basic IG account/media info after the connected IG User ID is found. |
| `pages_show_list` | Lists Pages the FB user can perform Tasks on through `/me/accounts`. |

Publishing (added later, before App Review):

| Permission | Why |
| --- | --- |
| `instagram_content_publish` | Required for `POST /media` and `POST /media_publish`. |
| `pages_read_engagement` | Listed by Meta for IG content publishing with Facebook Login. |
| `ads_management`, `ads_read` | Only required when the Page role was granted via Business Manager. |

Do not select these during first setup on either path:

- `business_management`
- `catalog_management`
- `leads_retrieval`
- `pages_manage_ads`, `pages_manage_metadata`, `pages_messaging`
- Any Threads, oEmbed, Marketing, or public-content permissions

## Restricted Permission Warning

If Meta shows **"Some permissions have been restricted and won't be requested from users of this app"**:

- If the warning appears after selecting publishing/ads/business/messaging/comments/leads permissions, remove them for now.
- If it appears for `instagram_business_content_publish` (IG-Login) or `instagram_content_publish` (FB-Login), continue without it during discovery and add it during the direct-publish phase.
- If it appears for `pages_read_engagement`, continue without it during discovery and add it during the direct-publish phase.
- If it appears for `instagram_business_basic`, `instagram_basic`, or `pages_show_list`, stop and check app role, app mode, Instagram Onboarding template, Facebook Login for Business setup, and permission access level.

The first-pass success target is unchanged: the token can read the IG business account (IG-Login) or can list Pages and resolve the connected IG business account (FB-Login).

## Discovery Sequences

### IG-Login Discovery

1. Implement Facebook Login for Business or the Instagram Business Login flow and request `instagram_business_basic`.
2. Obtain an Instagram-scoped User Access Token.
3. `GET /me?fields=id,username,account_type,media_count` and confirm `account_type` is `BUSINESS` or `MEDIA_CREATOR`.
4. `GET /<IG_USER_ID>/media?fields=id,media_type,timestamp` to prove media is readable.
5. Save `INSTAGRAM_BUSINESS_ACCOUNT_ID` and `INSTAGRAM_ACCESS_TOKEN`.

### FB-Login Discovery

1. Generate a Facebook User access token with `instagram_basic` + `pages_show_list`.
2. `GET /me/accounts?fields=id,name,tasks` and confirm the correct Page is returned with `CREATE_CONTENT` or `MANAGE`.
3. `GET /<FACEBOOK_PAGE_ID>?fields=instagram_business_account`.
4. `GET /<INSTAGRAM_BUSINESS_ACCOUNT_ID>?fields=id,username,account_type,media_count`.
5. `GET /<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media` to prove the IG account is readable.
6. Save `INSTAGRAM_FACEBOOK_PAGE_ID`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, and `INSTAGRAM_ACCESS_TOKEN`.

Run `/debug_token?input_token=<USER_ACCESS_TOKEN>` on either path to confirm the token belongs to the expected app/user and contains the expected scopes before saving anything.

## Graph API Explorer Tests

Run these before touching the app's `.env`.

| Test | Graph API Explorer path | Pass signal |
| --- | --- | --- |
| Token scopes | `/debug_token?input_token=<USER_ACCESS_TOKEN>` | Expected app/user; scopes match the chosen path. |
| Account read (IG-Login) | `/me?fields=id,username,account_type,media_count` | Username/account fields return; `account_type` is BUSINESS or MEDIA_CREATOR. |
| Page list (FB-Login) | `/me/accounts?fields=id,name,tasks` | Correct connected Page appears with `CREATE_CONTENT` or `MANAGE`. |
| IG linkage (FB-Login) | `/<FACEBOOK_PAGE_ID>?fields=instagram_business_account` | Response includes `instagram_business_account.id`. |
| Media read | `/<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media` | Response returns a `data` array without permission errors. |
| Publish quota | `/<INSTAGRAM_BUSINESS_ACCOUNT_ID>/content_publishing_limit?fields=config,quota_usage` | Returns current quota and 24-hour usage. |

Save into `.env`:

```text
INSTAGRAM_LOGIN_PATH=ig_login            # or fb_login
INSTAGRAM_BUSINESS_ACCOUNT_ID=<IG_USER_ID>
INSTAGRAM_FACEBOOK_PAGE_ID=<FACEBOOK_PAGE_ID>   # FB-Login only
INSTAGRAM_ACCESS_TOKEN=<USER_OR_LONG_LIVED_TOKEN>
INSTAGRAM_TOKEN_EXPIRES_AT=<UNIX_TIMESTAMP>
```

Never paste tokens into chat. Codex inspects diagnostics and logs, not raw secrets.

## Netlify URL Issue

For the local setup, prefer Graph API Explorer because it handles the OAuth callback. For the future cloud app:

- Use the production Netlify URL or a custom domain, not a temporary deploy preview URL.
- Confirm the URL loads publicly over HTTPS in a private browser window.
- Add only the bare domain in App Domains (e.g. `your-site.netlify.app`).
- For OAuth redirect URIs, add the exact backend callback URL under `Valid OAuth Redirect URIs`.
- The callback should live on the backend (e.g. `https://api.yourdomain.com/auth/meta/callback`) so the OAuth code can be exchanged server-side and the access token never reaches the browser.

## Supplied Article Images

The operator supplies article images. The AI does not generate Instagram images by default.

Local export mode is unchanged: Codex receives the image path, article URL, caption angle, required credit, and alt text, then creates a scheduling export referencing the supplied image for manual upload via Meta Business Suite.

Graph API mode adds the following validation before any `POST /media` call:

- File is JPEG (the only supported image format).
- File size ≤ 8 MB.
- Aspect ratio between 4:5 and 1.91:1.
- Caption ≤ 2,200 characters.
- `alt_text` ≤ 1,000 characters (image posts only — not Reels or Stories).
- `collaborators` array ≤ 3 usernames if used.
- Public HTTPS URL is reachable from outside the network (HEAD request returns 200 with correct content type).
- For Reels: MP4 or MOV, ≤ 300 MB, between 3 s and 15 min, 9:16 recommended.
- For Story video: ≤ 100 MB, between 3 s and 60 s.

For videos larger than the simple-upload limits, use the resumable upload endpoint:

```text
POST https://rupload.facebook.com/ig-api-upload/<IG_MEDIA_CONTAINER_ID>
```

with `upload_type=resumable` on the initial container creation.

## Local VSCode/Codex Priority Loop

Flow remains:

1. Codex starts or checks the backend.
2. Codex calls `/ready`.
3. Codex calls `/api/channels/instagram/diagnostics` (now also surfaces `content_publishing_limit`).
4. Codex generates a campaign pack.
5. The operator supplies the article image path, article URL, credit, and alt text.
6. Codex creates an Instagram scheduling export.
7. Codex calls `/api/publish-logs` and `/debug`.
8. Codex summarizes `publish_log_id`, `status`, `diagnostics`, `quota_remaining`, and `next_action`.

Safe local prompt:

```text
Act as the Social PR Autopilot Instagram operator. Prioritize the Instagram Graph API readiness path, but do not publish directly until the direct publish feature flag exists. First check /ready and /api/channels/instagram/diagnostics, including the current content_publishing_limit. Use my supplied article image path, credit, and alt text. Validate that the image is JPEG, under 8 MB, and within 4:5 to 1.91:1 aspect ratio. Generate the campaign pack, show me the Instagram caption (<=2200 chars) and alt text (<=1000 chars), then create a scheduling export. Afterward inspect /api/publish-logs and summarize status, diagnostics, quota_remaining, and next_action. Never print tokens or app secrets.
```

## Direct Graph API Adapter Plan

When ready to implement direct publishing, build the adapter Graph API-first with one shared interface that both login paths share.

### Environment

```text
INSTAGRAM_DIRECT_PUBLISH_ENABLED=false
INSTAGRAM_LOGIN_PATH=ig_login                # or fb_login
INSTAGRAM_BUSINESS_ACCOUNT_ID=<IG_USER_ID>
INSTAGRAM_FACEBOOK_PAGE_ID=<PAGE_ID>         # FB-Login only
INSTAGRAM_ACCESS_TOKEN=<LONG_LIVED_USER_TOKEN_OR_SECRET_REF>
INSTAGRAM_TOKEN_EXPIRES_AT=<UNIX_TIMESTAMP>
INSTAGRAM_RATE_LIMIT_PER_DAY=100             # Meta ceiling; can lower for safety
INSTAGRAM_GRAPH_API_VERSION=v23.0            # pin and bump deliberately
```

### Request Shape

Replace `image_prompt` as the source of truth. Add:

```text
media_url=<PUBLIC_HTTPS_IMAGE_URL>
media_asset_id=<DATABASE_OR_GCS_ASSET_ID>
media_type=IMAGE | VIDEO | REELS | STORIES | CAROUSEL
alt_text=<UP_TO_1000_CHARS>                  # image posts only
collaborators=[<UP_TO_3_USERNAMES>]
location_id=<OPTIONAL_LOCATION_PAGE_ID>
user_tags=[{username, x, y}]
product_tags=[{product_id, x, y}]
children=[<CONTAINER_IDS>]                   # CAROUSEL only, max 10
cover_url=<REELS_COVER_URL>                  # REELS only
thumb_offset=<MILLISECONDS>                  # REELS only
share_to_feed=true                           # REELS only
upload_type=resumable                        # large video only
```

Keep `image_prompt` for operator notes and AI directions, never as the publishing source.

### Publish Steps

1. Load token from secret storage.
2. Validate the `INSTAGRAM_DIRECT_PUBLISH_ENABLED` flag.
3. Validate account diagnostics (token unexpired, scopes correct, IG account reachable).
4. Call `GET /<IG_USER_ID>/content_publishing_limit?fields=config,quota_usage`. Refuse if `quota_usage` is at or above 100, or above the configured soft cap.
5. Validate supplied media metadata (format, size, dimensions, aspect ratio, duration, public URL reachable).
6. Validate caption length (≤ 2,200) and alt text length (≤ 1,000, image posts only).
7. Create the media container with `POST /<IG_USER_ID>/media`. Note the container expires in 24 hours.
8. Poll `GET /<IG_CONTAINER_ID>?fields=status_code` until `FINISHED`, or fail on `ERROR`/`EXPIRED`. Bound the wait.
9. Publish the container with `POST /<IG_USER_ID>/media_publish`.
10. Store platform response IDs and the full Graph API error body in durable publish logs.
11. Retry only when the error category is safe to retry; never retry on `EXPIRED` containers or on a 4xx with a permission/scope error.

### Never Skip These Guardrails

- Feature flag defaults to off.
- Direct publish requires a validated public media URL.
- Direct publish requires persistent publish logs.
- Direct publish requires token expiry tracking and a reconnect path.
- Direct publish requires a kill switch that can stop all Instagram publishing immediately.
- First production posts require manual approval.
- Codex/AI never sees raw tokens in chat context.
- Quota check runs before every publish, not just at startup.

## Cloud Automation Priority

Phase 1: Graph API readiness in cloud

- Deploy backend to Cloud Run.
- Put Meta secrets in Secret Manager. Rotate long-lived tokens before `INSTAGRAM_TOKEN_EXPIRES_AT`.
- Persist runs, media assets, publish logs, and quota snapshots in a database.
- Keep Instagram in export mode while diagnostics and quota checks run on schedule.

Phase 2: Approval-gated direct publish

- Add direct publish adapter behind `INSTAGRAM_DIRECT_PUBLISH_ENABLED`.
- Add supplied-image upload to GCS or equivalent and serve over public HTTPS with a stable URL.
- Store `media_url`, credit, alt text, dimensions, file size, MIME type, and validation status.
- Require human approval for each publish.
- Log container creation, status polling, publish response, and retry state.

Phase 3: Autonomous posting

- Cloud Scheduler triggers content planning.
- AI writes captions around supplied images and articles.
- Media-readiness agent validates supplied media against the constraint matrix above.
- Policy agent checks brand voice, claims, CTA, hashtags, and posting frequency.
- Channel-health agent checks token expiry, Page linkage (FB-Login), IG ID, `content_publishing_limit`, and recent failed publishes.
- Direct publish runs only when all checks pass.
- Failed publishes create debugging tasks automatically.
- Kill switch can stop all Instagram publishing immediately.

## Decision Table

| Situation | Preferred action |
| --- | --- |
| New account, no Facebook Page needed | Use Instagram Login with `instagram_business_basic`. |
| Existing Facebook Page operator with Page Tasks | Use Facebook Login with `instagram_basic` + `pages_show_list`. |
| Meta's token screen asks for an Instagram Tester | That is Instagram Login in dev/test mode. Assign tester in App Roles or fall back to Graph API Explorer. |
| Meta asks Creator Marketplace vs Instagram Onboarding | Choose Instagram Onboarding. |
| Meta warns permissions are restricted | Remove broad permissions and keep discovery minimal. |
| Netlify URL is rejected | Use Graph API Explorer for local setup; configure exact production HTTPS backend callback later. |
| Images are ready locally | Use scheduling export and manually attach supplied images. |
| Images need direct API publishing | Upload to public HTTPS storage and validate before Graph API calls. |
| Account is near the 100-post 24-hour quota | Refuse direct publish; queue for the next quota window. |
| Container status is `EXPIRED` | Create a new container; do not retry the old one. |
| App Review is not done | Keep export mode or admin/tester-only testing. |
| Direct publish is implemented but unproven | Keep feature flag off by default and require manual approval. |
| Cloud automation is live | Publish only after diagnostics, media, policy, and channel-health checks pass. |

## What Changed From v1

| Topic | v1 | v2 |
| --- | --- | --- |
| Primary readiness path | Facebook Login only | Both Instagram Login and Facebook Login |
| Discovery scopes | `instagram_basic` + `pages_show_list` | Path-dependent (see permissions matrix) |
| Publishing scopes | `instagram_content_publish`, `pages_read_engagement` | Adds `instagram_business_content_publish` for IG-Login; notes 2025-01-27 deprecation of old scopes on IG-Login |
| Rate limit | Not stated | 100 posts per rolling 24 hours per account; carousels count as one |
| Quota visibility | Not used | `GET /<IG_ID>/content_publishing_limit` called before every publish |
| Media constraints | Generic ("JPEG, max file size, supported aspect ratio") | Specific (JPEG, ≤ 8 MB, 4:5 to 1.91:1; Reels MP4/MOV ≤ 300 MB, 3 s–15 min; Story video ≤ 100 MB, 3–60 s) |
| Alt text | Mentioned generally | Documented as a 2025-03-24 image-post field, ≤ 1,000 chars |
| Container lifecycle | Not specified | Containers expire in 24 hours; up to 400 unpublished per account |
| Video uploads | Not specified | Resumable uploads via `rupload.facebook.com/ig-api-upload/<container_id>` |
| API version pinning | Not specified | `INSTAGRAM_GRAPH_API_VERSION` env var |

## References

- Meta Instagram Platform overview: https://developers.facebook.com/docs/instagram-platform/
- Meta Instagram API with Instagram Login: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
- Meta Instagram API with Facebook Login get-started: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started
- Meta Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Meta IG User Media reference: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
- Meta long-lived access tokens: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/
- Meta Graph API Explorer: https://developers.facebook.com/tools/explorer/
- Meta Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/
