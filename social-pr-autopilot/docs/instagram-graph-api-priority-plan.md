# Instagram Graph API Priority Plan

Last verified: 2026-05-11

This plan makes Instagram Graph API publishing the priority path for Social PR Autopilot while keeping the current scheduling export mode as a safe fallback. It is based on the current Meta Instagram API with Facebook Login and Content Publishing docs, plus the setup issues already encountered: template confusion, restricted permissions, Graph API Explorer testing, Netlify URL validation, supplied article images, and the desire to operate from VSCode/Codex now before moving to cloud automation.

## Positioning

Yes, Social PR Autopilot can prioritize the Instagram Graph API as much as possible. The product should treat Graph API publishing as the canonical end state, and treat Meta Business Suite scheduling export as a fallback for:

- setup periods before permissions are approved,
- accounts that fail token/Page/Instagram checks,
- supplied images that do not yet have a valid public media URL,
- first-run approval gates,
- Meta API outages or rate-limit issues.

The priority should be:

1. Connect and verify the Instagram account through Graph API.
2. Keep local VSCode/Codex operation export-only until the API path is proven.
3. Add direct Graph API publishing behind a feature flag.
4. Move credentials/media/logs to cloud infrastructure.
5. Make direct publishing autonomous only after diagnostics, media validation, App Review, and durable retry logs are in place.

## Current Meta Flow To Respect

Meta's Instagram API with Facebook Login get-started flow still starts with:

- an Instagram Business or Creator account,
- a Facebook Page connected to that Instagram account,
- a Facebook Developer account that can perform Tasks on that Page,
- a registered Facebook App with Basic settings configured.

The discovery flow uses:

- `instagram_basic`
- `pages_show_list`

The Graph API discovery sequence is:

1. Generate a User access token.
2. Call `GET /me/accounts`.
3. Confirm the correct Page is returned and has useful Tasks such as `CREATE_CONTENT` or `MANAGE`.
4. Call `GET /<FACEBOOK_PAGE_ID>?fields=instagram_business_account`.
5. Save `instagram_business_account.id`.
6. Call `GET /<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media` or account fields to prove the IG account is readable.

The content publishing flow later uses:

- `POST /<IG_ID>/media` to create a media container.
- `POST /<IG_ID>/media_publish` to publish that media container.
- `GET /<IG_CONTAINER_ID>?fields=status_code` to check container status when needed.

## Recommended Meta Setup Choices

### Template

Choose **Instagram Onboarding**.

Do not choose **Instagram Creator Marketplace**. Creator Marketplace is for creator/partner marketplace workflows, not for automating posts to the business's own Instagram account.

### Permissions: Select Now

For local setup and Graph API Explorer discovery, select only:

| Permission | Why |
| --- | --- |
| `instagram_basic` | Reads basic Instagram account/media information after the connected IG User ID is found. |
| `pages_show_list` | Lists Pages the Facebook user can perform Tasks on through `/me/accounts`. |

If Meta automatically selects dependency permissions, leave those automatic dependency selections in place. Do not manually add broad permissions during the first connection test.

### Permissions: Do Not Select Yet

Do not select these during the first setup:

- `ads_management`
- `ads_read`
- `business_management`
- `catalog_management`
- `instagram_manage_comments`
- `leads_retrieval`
- `pages_manage_ads`
- `pages_manage_metadata`
- `pages_messaging`
- `pages_read_engagement`

`pages_read_engagement` appears in Meta's content publishing requirements, but it is not needed for the initial account discovery test. Add it during the direct publishing phase.

### Permissions: Add Later For Direct Publishing

When the direct Instagram adapter exists and App Review is planned, add:

| Permission | Why |
| --- | --- |
| `instagram_content_publish` | Required for media container creation and publish calls with Facebook Login for Business. |
| `pages_read_engagement` | Listed by Meta for Instagram content publishing with Facebook Login for Business. |
| `instagram_basic` | Still needed for Instagram account access. |

Meta's content publishing docs also note that if the Page role is granted through Business Manager, the app may also need `ads_management` and `ads_read`. Treat those as later App Review/direct-publishing items, not part of the first Graph API Explorer test.

## Restricted Permission Warning

If Meta says **"Some permissions have been restricted and won't be requested from users of this app"**, do not keep adding permissions until it disappears.

Use this rule:

- If the warning appears after selecting ads/business/catalog/messaging/comments/leads/publishing permissions, remove those permissions for now.
- If it appears for `instagram_content_publish`, continue without it during discovery and add it during the direct-publish phase.
- If it appears for `pages_read_engagement`, continue without it during discovery and add it during the direct-publish phase.
- If it appears for `instagram_basic` or `pages_show_list`, stop and check app role, app mode, Instagram Onboarding template, Facebook Login for Business setup, and permission access level.

For local setup, the only success target is: the token can list Pages and find the connected Instagram business account.

## Netlify URL Issue

If Meta says **"The website you entered seems broken. Check the URL to make sure it's correct."**, the URL/domain setup is not passing Meta's validation.

For a Netlify-hosted frontend:

- Use the production Netlify URL or a custom domain, not a temporary deploy preview URL.
- Confirm the URL loads publicly over HTTPS in a private browser window.
- Add only the bare domain in App Domains, for example `your-site.netlify.app` or `yourdomain.com`.
- Do not include `https://`, paths, query strings, or trailing slashes in App Domains.
- For OAuth redirect URIs, add the exact callback URL under `Valid OAuth Redirect URIs`.
- Do not point the OAuth callback at a frontend route unless it actually exchanges the OAuth code through a backend.

For the current local setup, avoid this issue by using Graph API Explorer. Graph API Explorer handles the login callback, so you do not need a Netlify callback URL yet.

For the future cloud app, the OAuth callback should usually live on the backend, such as:

```text
https://api.yourdomain.com/auth/meta/callback
```

If the backend is Cloud Run and the frontend is Netlify, the Meta app should include:

- frontend domain in App Domains if needed for app identity,
- backend callback URL in Valid OAuth Redirect URIs,
- matching production HTTPS URLs only.

## Graph API Explorer Tests

Run these before touching the app's `.env`.

| Test | Graph API Explorer path | Pass signal |
| --- | --- | --- |
| Token scopes | `/debug_token?input_token=<USER_ACCESS_TOKEN>` | Expected app/user and scopes include `instagram_basic` + `pages_show_list`. |
| Page list | `/me/accounts?fields=id,name,tasks` | Correct connected Page appears. |
| Page Tasks | `/me/accounts?fields=id,name,tasks` | Correct Page includes `CREATE_CONTENT` or `MANAGE`. |
| IG account linkage | `/<FACEBOOK_PAGE_ID>?fields=instagram_business_account` | Response includes `instagram_business_account.id`. |
| IG account read | `/<INSTAGRAM_BUSINESS_ACCOUNT_ID>?fields=id,username,account_type,media_count` | Expected username/account fields return. |
| IG media read | `/<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media` | Response returns a `data` array and does not permission-error. |

Save:

```text
INSTAGRAM_FACEBOOK_PAGE_ID=<FACEBOOK_PAGE_ID>
INSTAGRAM_BUSINESS_ACCOUNT_ID=<INSTAGRAM_BUSINESS_ACCOUNT_ID>
INSTAGRAM_ACCESS_TOKEN=<USER_OR_LONG_LIVED_USER_ACCESS_TOKEN>
```

Do not paste tokens into chat. Codex should be allowed to inspect diagnostics and logs, not raw secrets.

## Supplied Article Images

The operator will provide article images. The AI should not default to generating Instagram images.

Local mode:

- Codex receives the image path, article URL, caption angle, required credit, and alt text.
- The app creates a scheduling export that references the supplied image.
- The operator manually attaches the supplied image in Meta Business Suite.

Graph API publishing mode:

- The provided image must be uploaded to a public HTTPS URL that Meta can fetch.
- The backend should pass a validated `media_url` or durable asset ID into the Instagram adapter.
- The system should validate image dimensions, file size, MIME type, URL accessibility, caption length, credit, and alt text before creating a media container.

For image posts, Meta's IG User media reference includes constraints such as JPEG format, maximum file size, supported aspect ratio, and min/max width. Add automated checks before direct publish so Meta errors are caught before the API call.

## Local VSCode/Codex Priority Loop

Use this flow now:

1. Codex starts or checks the backend.
2. Codex calls `/ready`.
3. Codex calls `/api/channels/instagram/diagnostics`.
4. Codex generates a campaign pack.
5. The operator supplies the article image path, article URL, credit, and alt text.
6. Codex creates an Instagram scheduling export.
7. Codex calls `/api/publish-logs` and `/debug`.
8. Codex summarizes `publish_log_id`, `status`, `diagnostics`, and `next_action`.

Safe local prompt:

```text
Act as the Social PR Autopilot Instagram operator. Prioritize the Instagram Graph API readiness path, but do not publish directly until the direct publish feature flag exists. First check /ready and /api/channels/instagram/diagnostics. Use my supplied article image path, credit, and alt text. Generate the campaign pack, show me the Instagram caption and image selection, then create a scheduling export. Afterward inspect /api/publish-logs and summarize status, diagnostics, and next_action. Never print tokens or app secrets.
```

## Direct Graph API Adapter Plan

When ready to implement direct publishing, make the adapter Graph API-first:

### Environment

```text
INSTAGRAM_DIRECT_PUBLISH_ENABLED=false
INSTAGRAM_BUSINESS_ACCOUNT_ID=<IG_USER_ID>
INSTAGRAM_FACEBOOK_PAGE_ID=<PAGE_ID>
INSTAGRAM_ACCESS_TOKEN=<LONG_LIVED_USER_TOKEN_OR_SECRET_REF>
INSTAGRAM_RATE_LIMIT=25/3600
```

### Request Shape

The current `PublishRequest` has `image_prompt`, which is enough for export mode but not enough for direct Graph API publishing. Add one of these later:

```text
media_url=<PUBLIC_HTTPS_IMAGE_URL>
media_asset_id=<DATABASE_OR_GCS_ASSET_ID>
```

Keep `image_prompt` for operator notes and AI-generated directions, but use `media_url` or `media_asset_id` as the publishing source of truth.

### Publish Steps

1. Load token from secret storage.
2. Validate feature flag.
3. Validate account diagnostics.
4. Validate supplied image metadata and public URL fetchability.
5. Create media container with `POST /<IG_ID>/media`.
6. Check container status when needed.
7. Publish container with `POST /<IG_ID>/media_publish`.
8. Store platform response IDs and Graph API error body in durable publish logs.
9. Retry only when the error category is safe to retry.

### Never Skip These Guardrails

- Feature flag defaults to off.
- Direct publish requires a public media URL.
- Direct publish requires persistent publish logs.
- Direct publish requires token expiry/reconnect handling.
- Direct publish requires a kill switch.
- First production posts require manual approval.
- Codex/AI never sees raw tokens in chat context.

## Cloud Automation Priority

Phase 1: Graph API readiness in cloud

- Deploy backend to Cloud Run.
- Put Meta secrets in Secret Manager.
- Persist runs, media assets, and publish logs in a database.
- Keep Instagram in export mode while diagnostics run on schedule.

Phase 2: Approval-gated direct publish

- Add direct publish adapter behind `INSTAGRAM_DIRECT_PUBLISH_ENABLED`.
- Add supplied-image upload to GCS or equivalent.
- Store `media_url`, credit, alt text, dimensions, and validation status.
- Require human approval for each publish.
- Log container creation, status polling, publish response, and retry state.

Phase 3: Autonomous posting

- Cloud Scheduler triggers content planning.
- AI writes captions around supplied images/articles.
- Media-readiness agent validates the supplied images.
- Policy agent checks brand voice, claims, CTA, hashtags, and posting frequency.
- Channel-health agent checks token, Page linkage, IG ID, rate limits, and failed publishes.
- Direct publish runs only when all checks pass.
- Failed publishes create debugging tasks automatically.
- Kill switch can stop all Instagram publishing immediately.

## Decision Table

| Situation | Preferred action |
| --- | --- |
| Need to connect account today | Use Graph API Explorer with `instagram_basic` + `pages_show_list`. |
| Meta asks Creator Marketplace vs Instagram Onboarding | Choose Instagram Onboarding. |
| Meta warns permissions are restricted | Remove broad permissions and keep discovery minimal. |
| Netlify URL is rejected | Use Graph API Explorer for local setup, or configure exact production HTTPS backend callback later. |
| Images are ready locally | Use scheduling export and manually attach supplied images. |
| Images need direct API publishing | Upload to public HTTPS storage and validate before Graph API calls. |
| App Review is not done | Keep export mode or admin/tester-only testing. |
| Direct publish is implemented but unproven | Keep feature flag off by default and require manual approval. |
| Cloud automation is live | Publish only after diagnostics, media, policy, and channel-health checks pass. |

## References

- Meta Instagram API with Facebook Login get-started: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started
- Meta Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Meta IG User Media reference: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
- Meta long-lived access tokens: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/
- Meta Graph API Explorer: https://developers.facebook.com/tools/explorer/
- Meta Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/
