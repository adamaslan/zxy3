# Connect An Instagram Account

Last verified: 2026-05-12

This is the Instagram-first setup guide for Social PR Autopilot. It follows Meta's "Instagram API with Facebook Login for Business" get-started flow: start with an Instagram Business or Creator account, connect that account to a Facebook Page, use a Facebook Developer account that can perform Tasks on that Page, and use a registered Facebook App with Basic settings configured.

Social PR Autopilot still uses Instagram scheduling export today. These steps make the account, Page, app, token, and IDs ready for the future direct-publishing adapter.

## Automation Goal

The target workflow is:

1. Use VSCode plus an AI coding/chat agent such as Codex to run the app locally.
2. Generate a campaign pack from a launch brief.
3. Provide the article/image assets that should be used for the post.
4. Ask the agent to inspect Instagram diagnostics before attempting any publish/export action.
5. Export or queue the Instagram post locally while direct publishing is still disabled.
6. Later, move the same workflow to a cloud agent that runs on a schedule, creates captions around supplied assets, validates media, publishes through Meta's API, and records every action in durable logs.

This guide is optimized for that path. It separates account connection from autonomous posting so the local setup can be safe now and cloud automation can become reliable later.

## Current App Behavior

Social PR Autopilot treats Instagram as `scheduling_export`:

- The dashboard generates Instagram-ready copy and an export payload.
- Backend diagnostics look for `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_FACEBOOK_PAGE_ID`, and `INSTAGRAM_ACCESS_TOKEN`.
- Direct publishing remains off until account setup, permission review, token storage, public media URLs, media container creation, publish behavior, and retry handling are proven.

For Codex/VSCode automation, the current safe command is "generate and export," not "publish live to Instagram." Live direct publishing should only be enabled after the direct-publish adapter, media validation, persistent logs, and token handling are implemented.

Because article images will be provided by the operator, the AI should treat image work as asset selection and validation, not default image generation. Image generation can remain optional for missing assets, alternates, or future experiments.

## Meta Requirements

Meta's get-started guide requires all four items before the API calls will work:

- **An Instagram Business Account or Instagram Creator Account.**
- **A Facebook Page connected to that account.**
- **A Facebook Developer account that can perform Tasks on that Page.**
- **A registered Facebook App with Basic settings configured.**

Do the setup in this order. It prevents the common failure where the app is fine, but `/me/accounts` cannot see the right Page or the Page has no connected `instagram_business_account`.

## Step 1: Prepare The Instagram Account

Start in Instagram, not Facebook:

1. Log into the Instagram account that Social PR Autopilot should publish for.
2. Switch it to a Professional account if it is still personal.
3. Choose Business for company/brand accounts. Creator can work for API discovery, but Business is the cleaner default for B2B SaaS automation.
4. Confirm the public business profile information is complete.
5. Confirm the same real person who will create the Meta app can log into Facebook and manage the connected Page.

Do not continue until the Instagram account is Professional. Personal Instagram accounts are not valid for this Facebook Login Graph API path.

## Step 2: Connect A Facebook Page To That Instagram Account

The connected Page is the bridge that lets Facebook Login discover the Instagram account. The Page must be connected to the exact Instagram account you want Social PR Autopilot to use.

### Connect From Facebook

Use this path when you already know the Page:

1. Log into Facebook as a user with access to the Page.
2. Switch into the Page profile.
3. Open `Settings & privacy` -> `Settings`.
4. Under `Permissions`, open `Linked accounts`.
5. Next to Instagram, choose `View`.
6. Choose `Connect account`.
7. Log into the Instagram Professional account.
8. Complete Meta's prompts until the Page and Instagram account show as linked.

### Connect From Instagram

Use this path when you are starting from the Instagram app:

1. Open Instagram and go to the Professional account profile.
2. Tap `Edit profile`.
3. In the public business information area, choose `Page`.
4. Select the existing Facebook Page, or create a new Page if this brand does not have one.
5. Finish the prompts and confirm the selected Page is shown on the Instagram profile settings.

### Verify The Connection In Meta Business Suite

After connecting:

1. Open Meta Business Suite or Business Settings.
2. Check that the Facebook Page and Instagram account are both present as business assets.
3. Confirm the Page shows the Instagram account as linked.
4. Confirm the Instagram account shows the same Page as linked.

If Meta asks you to switch the Instagram account to Professional during this flow, complete that switch and then reconnect the Page.

## Step 3: Make Sure The Facebook Developer Account Can Perform Tasks On The Page

This part is easy to miss: the Facebook account used to create/test the Meta app must also be able to perform Tasks on the connected Page. Being a developer on the app is not enough.

The Meta get-started response for `GET /me/accounts` includes a `tasks` array. For the connected Page, you want to see relevant tasks such as:

- `MANAGE`
- `CREATE_CONTENT`
- `MODERATE`
- `ADVERTISE`
- `ANALYZE`

For Social PR Autopilot, `CREATE_CONTENT` or `MANAGE` is the important publishing-readiness signal.

### Grant Page Access

Use one of these paths:

- Page settings path: open the Facebook Page, go to `Settings` -> `Page access`, and add the Facebook user with full Facebook access or task access that includes content creation/management.
- Business settings path: open Meta Business Settings, go to `Users` -> `People`, choose the Facebook user, assign the Page asset, and enable content/management permissions. Also assign the linked Instagram account asset if Business Settings separates it.

Then log out/in or refresh the Graph API token. Old tokens can keep old Page permissions.

## Step 4: Register A Facebook App With Basic Settings Configured

Create or update the Meta app before requesting tokens.

1. Go to `developers.facebook.com/apps`.
2. Create an app, or open the existing app for Social PR Autopilot.
3. Use a business-oriented app type/use case if Meta prompts for one.
4. Open `Settings` -> `Basic`.
5. Fill in at least:
   - App display name.
   - App contact email.
   - App domains, when you have a hosted frontend/backend domain.
   - Privacy Policy URL, before App Review or Live Mode.
   - Category.
   - Business portfolio/Business Manager, if Meta asks for it.
6. Save changes.
7. Copy the App ID and App Secret into your password manager or secret store. Do not commit them.

For local/manual testing, Graph API Explorer can stand in for your app's OAuth UI. For a real SaaS onboarding flow, build OAuth screens later.

## Step 5: Configure Facebook Login For Business

This step has two paths. Use **Path A** for local setup right now. Use **Path B** later when Social PR Autopilot has a real "Connect Instagram" button.

### Path A: Local Setup With Graph API Explorer

This is the simplest path for today.

1. Open the Meta app in `developers.facebook.com/apps`.
2. In the left sidebar, choose `Add product`.
3. Add `Facebook Login for Business`.
4. Save/continue through the setup screen.
5. Do not add a redirect URI for this local Graph API Explorer test.
6. Leave the Facebook Login for Business settings on their defaults.
7. Go to Step 6 and generate the token in Graph API Explorer.

Why no redirect URI here? Graph API Explorer handles the login callback for you. You are not building the OAuth redirect flow yet; you are only generating a temporary User access token to prove the Instagram account and Page are connected correctly.

### If Meta Asks For A Template

Choose **Instagram Onboarding**.

Use this template because Social PR Autopilot needs to connect to the business's own Instagram account, confirm basic Instagram access, discover the connected Facebook Page, and later prepare for publishing automation.

Do not choose **Instagram Creator Marketplace** for this app. That template is for creator marketplace/partner access workflows, such as finding or working with creators for branded content. It is not the right starting point for automating posts to your own connected Instagram Business account.

After choosing Instagram Onboarding, keep following this guide:

- Step 6: request `instagram_basic` and `pages_show_list` for account discovery.
- Step 8: confirm `/me/accounts` returns the connected Facebook Page.
- Step 9: confirm the Page returns `instagram_business_account`.
- Future direct publishing: add `instagram_content_publish` only when the direct publishing adapter and App Review path are ready.

### Path B: Real OAuth Setup Later

Use this path when the app has an onboarding flow where a user clicks "Connect Instagram" inside Social PR Autopilot.

1. Open the Meta app in `developers.facebook.com/apps`.
2. Confirm `Facebook Login for Business` is added.
3. Open the Facebook Login for Business settings.
4. Add your backend callback URL under `Valid OAuth Redirect URIs`.
5. Save changes.

Example callback URLs:

```text
http://localhost:8102/auth/meta/callback
https://api.yourdomain.com/auth/meta/callback
```

Only add redirect URIs that your backend actually owns and handles. Do not use a frontend-only route unless the frontend securely exchanges the OAuth code through the backend. For local OAuth examples, prefer `localhost` over `127.0.0.1` because Meta's redirect validation is often stricter than a normal browser request and may reject numeric loopback URLs.

### What To Check Before Moving On

Before Step 6, confirm:

- `Facebook Login for Business` appears in the app's products.
- `Settings` -> `Basic` has the app display name, contact email, category, and any required business fields saved.
- The Facebook user you will log in with is listed as an app admin/developer/tester or the app is already approved/live.
- The same Facebook user has Page Tasks on the Page connected to the Instagram account.

Keep the app in Development Mode while testing with app admins, developers, or testers. In Development Mode, only those app roles can complete login successfully. For customer accounts outside your team, the app will need Live Mode plus App Review/Advanced Access for the requested permissions.

## Step 6: Request The Exact Get-Started Permissions

For Meta's get-started flow, request only the permissions required to prove account discovery:

- `instagram_basic`
- `pages_show_list`

Those two permissions are enough to prove that Facebook Login can find the Facebook Page and then find the Instagram Business/Creator account connected to that Page.

### Permission Picker: What To Select Now

For the current local setup, select only:

| Permission | Select now? | Why |
| --- | --- | --- |
| `instagram_basic` | Yes | Required to read basic Instagram account/media information after the connected IG User ID is found. |
| `pages_show_list` | Yes | Required for `/me/accounts`, which lists the Facebook Pages the logged-in user can perform Tasks on. |

If Meta automatically selects dependency permissions, leave the automatic dependency selections in place. Do not manually add broad permissions just because they appear in the list.

If Meta shows **"Some permissions have been restricted and won't be requested from users of this app"**, treat that as an App Review/access-state warning. It means one or more selected permissions are restricted for this app, so Meta will not include them in the user consent request. For the first local connection test, remove restricted/broad permissions and keep only `instagram_basic` and `pages_show_list` unless Meta itself adds dependencies. If one of the required discovery permissions is restricted, confirm the app role, app mode, template choice, and permission access level before continuing.

### Do Not Select These For The First Connection Test

Skip these while you are only proving Instagram account discovery:

| Permission | Skip for now because |
| --- | --- |
| `ads_management` | Ads/Marketing API access; not needed to find the connected Instagram account. |
| `ads_read` | Ads reporting/server event access; not needed for account discovery. |
| `business_management` | Broad Business Manager API read/write access; too broad for this first setup. |
| `catalog_management` | Product catalog access; unrelated to posting articles to Instagram. |
| `instagram_manage_comments` | Comment moderation/replies; useful later only if you build comment automation. |
| `leads_retrieval` | Lead ads forms; unrelated to Instagram posting. |
| `pages_manage_ads` | Page ad management; unrelated to organic/scheduling export posting. |
| `pages_manage_metadata` | Page settings/webhooks; not needed for the first discovery test. |
| `pages_messaging` | Messenger conversations; unrelated to Instagram posting. |
| `pages_read_engagement` | Not needed for the get-started discovery flow; add later only when direct publishing requires it. |

### Add Later For Direct Publishing

When Social PR Autopilot has a real direct Instagram publishing adapter, expect to request:

| Permission | Add later? | Why |
| --- | --- | --- |
| `instagram_content_publish` | Yes | Required for Instagram media container creation and publish calls. |
| `pages_read_engagement` | Yes | Listed by Meta for Instagram content publishing with Facebook Login for Business. |
| `instagram_basic` | Keep | Still needed for Instagram account access. |

Meta's content publishing docs also note that if the app user's Page role comes through Business Manager, publishing may require `ads_management` and `ads_read`. Treat those as a later App Review/direct-publishing issue, not part of today's connection test.

Restricted-permission warning guidance:

- If the warning appears after selecting ads, business, messaging, comments, leads, catalog, or publishing permissions, remove those permissions for now.
- If the warning appears for `instagram_content_publish`, continue without it during account discovery; add it only during the direct-publishing/App Review phase.
- If the warning appears for `pages_read_engagement`, continue without it during account discovery; add it later if the direct publishing adapter needs it.
- If the warning appears for `instagram_basic` or `pages_show_list`, stop and check that you chose the Instagram Onboarding template, added Facebook Login for Business, are using an app admin/developer/tester, and are still operating in a valid development/test setup.

Use each permission for a specific reason:

| Permission | Why Social PR Autopilot needs it during setup |
| --- | --- |
| `pages_show_list` | Lets the token call `/me/accounts` and list Pages the Facebook user can perform Tasks on. |
| `instagram_basic` | Lets the token read basic Instagram account and media information once the connected IG User ID is discovered. |

When using Graph API Explorer:

1. Select the Social PR Autopilot Meta app from the app dropdown.
2. Select a recent Graph API version, such as `v25.0`.
3. Click `Generate Access Token`.
4. In the permission selector, add `instagram_basic`.
5. Add `pages_show_list`.
6. Generate the token while logged in as the Facebook user who has Tasks on the connected Page.
7. Approve the permission modal.

When implementing OAuth manually later, the permission list should appear in the `scope` parameter:

```text
scope=instagram_basic,pages_show_list
```

For the first connection test, do not add extra permissions just because they may be useful later. A smaller scope makes debugging much clearer:

- If `/me/accounts` fails, focus on Facebook Login, `pages_show_list`, app role, and Page Task access.
- If Page discovery works but `instagram_business_account` is missing, focus on the Instagram-to-Page connection.
- If Instagram media access fails, focus on `instagram_basic`, the selected IG User ID, and token validity.

Later, for direct publishing, Social PR Autopilot will also need publishing-specific permission such as `instagram_content_publish`, plus App Review/Advanced Access for customer accounts. Keep that separate from this first connection test.

## Step 7: Get A User Access Token

Trigger Facebook Login for Business from your app or Graph API Explorer while signed into the Facebook Developer account that has Tasks on the connected Page. The token belongs to that Facebook user, not directly to the Instagram account.

Grant:

- `instagram_basic`
- `pages_show_list`

### Using Graph API Explorer

Graph API Explorer is the fastest local setup path:

1. Open `https://developers.facebook.com/tools/explorer/`.
2. Choose the Social PR Autopilot app.
3. Choose `User Token`.
4. Add the `instagram_basic` and `pages_show_list` permissions.
5. Click `Generate Access Token`.
6. Complete the Facebook Login modal.
7. Capture the token shown in the Access Token field.
8. Immediately test it with `/me/accounts` in Step 8.

If the permission modal does not show the requested scopes, confirm you selected the right Meta app and that Facebook Login for Business is added to that app.

### Troubleshooting The Generate Access Tokens Screen

If Meta shows a section like **"Generate access tokens"** with text such as **"Add an Instagram account to generate access tokens and setup webhook subscriptions"**, pause and confirm which Instagram API setup you are in.

That dashboard section usually belongs to **Instagram > API Setup with Instagram Login**. Meta's own app setup docs now auto-add that setup when you add the Instagram product, but they also say that if you are building for an Instagram Professional account linked to a Facebook Page, use **API Setup with Facebook Login** instead. Social PR Autopilot is currently written for the Facebook Login path, because the app needs `/me/accounts`, the Facebook Page ID, and `instagram_business_account`.

Use this decision rule:

| What you see | What it means | What to do |
| --- | --- | --- |
| `Instagram > API Setup with Instagram Login` asks you to add an Instagram tester/account | You are in the Instagram Login path, which is useful for Instagram-only APIs but is not the current Social PR Autopilot token path | Do not fight this screen for local setup. Switch to **API Setup with Facebook Login** or use Graph API Explorer with the Social PR Autopilot app. |
| Meta says to assign the Instagram Tester role before generating a token | The Instagram Login token generator will only issue test tokens for assigned Instagram tester accounts | If intentionally testing Instagram Login, add the account under `App Roles > Roles` or the Instagram setup screen, make sure the account is public, accept any invite/login prompt, then retry. For this project, Graph API Explorer is still the preferred local path. |
| The `Generate token` button is missing, disabled, or loops | The Instagram account is not assigned as a tester, the wrong app is selected, browser sessions are mixed, the app is not fully configured, or Meta has not refreshed the tester assignment yet | Confirm the app, assign the tester role, log out/in to Instagram and Facebook, allow popups/cookies, wait a few minutes, and retry in a clean browser profile. |
| A token is generated but `/me/accounts` fails or returns no Pages | The token is likely not the Facebook User access token this guide expects, or the Facebook user lacks Page access | Generate a **User Token** in Graph API Explorer with `instagram_basic` + `pages_show_list`, signed in as the Facebook user with Page Tasks. |
| The webhook setup is blocking progress | Webhooks are useful later for comments/messages/events, but they are not required for the first Page/Instagram discovery test | Skip webhook setup for now and prove `/me/accounts` plus `instagram_business_account` first. |

Fast recovery path for Social PR Autopilot:

1. Open `https://developers.facebook.com/tools/explorer/`.
2. Select the Social PR Autopilot Meta app.
3. Choose `User Token`.
4. Add only `instagram_basic` and `pages_show_list`.
5. Generate the token while logged in as the Facebook user that can manage or create content on the connected Page.
6. Run `/me/accounts?fields=id,name,tasks`.
7. Run `/<FACEBOOK_PAGE_ID>?fields=instagram_business_account`.

Do not paste the generated token into chat, screenshots, docs, or git. Store it only in your local `.env` or secret manager.

### Using Manual OAuth Later

For a future in-app onboarding flow, redirect the user to Meta OAuth with the app ID, redirect URI, response type, and scopes. The shape is:

```text
https://www.facebook.com/v25.0/dialog/oauth
  ?client_id=<META_APP_ID>
  &redirect_uri=<URL_ENCODED_BACKEND_CALLBACK>
  &response_type=code
  &scope=instagram_basic,pages_show_list
```

After Meta redirects back to the backend with a `code`, the backend exchanges that code for a User access token. Do not let the frontend store long-lived tokens.

### Validate The Token

Use Meta's Access Token Debugger or Graph API calls to confirm:

- The token is for the expected Meta app.
- The token belongs to the expected Facebook user.
- The token includes `instagram_basic`.
- The token includes `pages_show_list`.
- The token has not expired.

You can also inspect it with:

```bash
curl "https://graph.facebook.com/debug_token?input_token=<USER_ACCESS_TOKEN>&access_token=<META_APP_ID>|<META_APP_SECRET>"
```

### Graph API Explorer Test Checklist

Run these tests in Graph API Explorer immediately after generating the User access token. Use `GET` for all of them.

Do not paste access tokens into chat. Keep test output local unless you have removed token values.

| Test | Graph API Explorer path | Pass signal | If it fails |
| --- | --- | --- | --- |
| Token has the right scopes | `/debug_token?input_token=<USER_ACCESS_TOKEN>` | Response shows the expected app, user, expiry, and scopes including `instagram_basic` and `pages_show_list`. | Regenerate the token from the correct app and Facebook user. |
| User can list Pages | `/me/accounts` | Response includes the Facebook Page connected to the Instagram account. | Check `pages_show_list`, Page access, app role, and which Facebook user is logged in. |
| Page has usable Tasks | `/me/accounts?fields=id,name,tasks` | Connected Page includes `CREATE_CONTENT` or `MANAGE` in `tasks`. | Grant the Facebook user stronger Page access in Page settings or Business Settings. |
| Page exposes Instagram account | `/<FACEBOOK_PAGE_ID>?fields=instagram_business_account` | Response includes `instagram_business_account.id`. | Reconnect the Instagram Professional account to the Facebook Page. |
| Instagram account is readable | `/<INSTAGRAM_BUSINESS_ACCOUNT_ID>?fields=id,username,account_type,media_count` | Response includes the expected username/account fields. | Check `instagram_basic`, the IG account ID, and token validity. |
| Instagram media endpoint works | `/<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media` | Response returns a `data` array. It may be empty for a new account, but the call should not permission-error. | Check account type, Page linkage, token scopes, and app user/Page Tasks. |

### Graph API Explorer Test Sequence

Use this order. Each passing step narrows the next problem.

1. Run `GET /debug_token?input_token=<USER_ACCESS_TOKEN>`.
2. Run `GET /me/accounts?fields=id,name,tasks`.
3. Copy the correct Page `id`.
4. Run `GET /<FACEBOOK_PAGE_ID>?fields=instagram_business_account`.
5. Copy `instagram_business_account.id`.
6. Run `GET /<INSTAGRAM_BUSINESS_ACCOUNT_ID>?fields=id,username,account_type,media_count`.
7. Run `GET /<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media`.

Record these values for local `.env` setup:

```text
INSTAGRAM_FACEBOOK_PAGE_ID=<FACEBOOK_PAGE_ID>
INSTAGRAM_BUSINESS_ACCOUNT_ID=<INSTAGRAM_BUSINESS_ACCOUNT_ID>
INSTAGRAM_ACCESS_TOKEN=<USER_OR_LONG_LIVED_USER_ACCESS_TOKEN>
```

If all tests pass in Graph API Explorer but Social PR Autopilot diagnostics still show missing config, restart the backend and confirm the values are in the repo root `.env`, not only in a shell session.

### Short-Lived Vs Long-Lived

For local testing, a short-lived User access token can prove the setup. For anything persistent, exchange it for a long-lived User access token and store it securely.

```bash
curl "https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=<META_APP_ID>&client_secret=<META_APP_SECRET>&fb_exchange_token=<SHORT_LIVED_USER_TOKEN>"
```

Use the returned `access_token` as `INSTAGRAM_ACCESS_TOKEN` only for local development. For production, store it encrypted, track expiry, and build a reconnect path.

Do not commit access tokens, app secrets, screenshots containing tokens, or copied Graph API Explorer URLs with tokens in them.

## Step 8: Get The User's Pages

Call `/me/accounts` with the token:

```bash
curl -i -X GET \
  "https://graph.facebook.com/v25.0/me/accounts?access_token=<USER_ACCESS_TOKEN>"
```

Find the Page connected to the Instagram account. Save:

- The Page `id`.
- The Page `name`, for operator sanity checks.
- The Page `tasks` array.

Expected shape:

```json
{
  "data": [
    {
      "name": "Example Brand",
      "id": "1234567890",
      "tasks": ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT", "MANAGE"]
    }
  ]
}
```

If the correct Page is missing, the Facebook user does not have the right Page access, the token lacks `pages_show_list`, or the Page is owned/assigned through a Business portfolio the user cannot access.

## Step 9: Get The Page's Instagram Business Account

Use the Page ID from Step 8:

```bash
curl -i -X GET \
  "https://graph.facebook.com/v25.0/<FACEBOOK_PAGE_ID>?fields=instagram_business_account&access_token=<USER_ACCESS_TOKEN>"
```

Expected shape:

```json
{
  "instagram_business_account": {
    "id": "17841400000000000"
  },
  "id": "1234567890"
}
```

Save:

- `INSTAGRAM_FACEBOOK_PAGE_ID`: the Page `id`.
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`: `instagram_business_account.id`.

If `instagram_business_account` is missing, the Page is not connected to the Instagram Professional account, or the connected Instagram account is not eligible for this API path.

## Step 10: Verify Instagram Media Access

Use the Instagram business account ID:

```bash
curl -i -X GET \
  "https://graph.facebook.com/v25.0/<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media?access_token=<USER_ACCESS_TOKEN>"
```

If this returns media IDs, the Instagram-first connection is working. At that point, Social PR Autopilot has the IDs it needs for readiness diagnostics.

## Step 11: Add Local Env Values

In the repo root `.env`:

```bash
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400000000000
INSTAGRAM_FACEBOOK_PAGE_ID=1234567890
INSTAGRAM_ACCESS_TOKEN=<USER_OR_LONG_LIVED_USER_ACCESS_TOKEN>
```

Restart the backend after editing `.env`.

Then check diagnostics:

```bash
curl http://127.0.0.1:8102/api/channels
curl http://127.0.0.1:8102/api/channels/instagram/diagnostics
```

The app will still export Instagram scheduling payloads. The goal of this setup is to remove account/linkage/token uncertainty before direct publishing is implemented.

## Step 12: Stage The Article Images

Use supplied article images as the source of truth for Instagram creative.

For local VSCode/Codex operation:

1. Put the approved image somewhere outside chat, such as a local assets folder or the article CMS/export folder.
2. Give Codex the local filename, article URL, target caption angle, and any required credit/alt text.
3. Ask Codex to reference the image in the scheduling export notes instead of generating a new image.
4. Keep the original image file available for manual upload into Meta Business Suite while Instagram is still export-only.

Example local asset note:

```text
Article: https://example.com/articles/social-pr-autopilot-launch
Image file: /path/to/approved-images/social-pr-autopilot-launch-hero.jpg
Required credit: Example Team
Alt text: Dashboard showing automated social campaign generation and publish diagnostics.
```

For future direct publishing, Meta needs a public HTTPS media URL that it can fetch. That means the cloud version should upload the provided image to a controlled storage location, such as GCS, validate it, and pass the resulting media URL into the Instagram adapter. Do not ask Codex to paste binary image data or private local file paths into Meta API calls.

## Step 13: Run The Local VSCode + Codex Automation Loop

Use this loop when you want an AI chat/coding agent to operate the app from VSCode without giving it open-ended permission to publish live Instagram posts.

### Start Local Services

From the repo root:

```bash
cd social-pr-autopilot
make backend
```

In a second terminal:

```bash
cd social-pr-autopilot
make frontend
```

Expected local URLs:

- Backend: `http://127.0.0.1:8102`
- Frontend: `http://127.0.0.1:3102`

### Agent Safety Rules

Give Codex or another AI operator these rules:

- Always check `/ready` before generating content.
- Always check `/api/channels/instagram/diagnostics` before any Instagram action.
- Treat Instagram as export-only until direct publishing is explicitly implemented and feature-flagged.
- Never print or paste `INSTAGRAM_ACCESS_TOKEN`, Meta App Secret, or OAuth callback codes into chat.
- Never commit `.env`, token debugger output, screenshots containing tokens, or Graph API Explorer URLs containing tokens.
- Save publish/export results through the app's publish-log endpoints instead of ad hoc notes.

### Local Readiness Commands

```bash
curl http://127.0.0.1:8102/ready
curl http://127.0.0.1:8102/api/channels/instagram/diagnostics
curl http://127.0.0.1:8102/api/publish-logs
```

The Instagram diagnostics should show missing config as empty once the env values are loaded. The mode should still be `scheduling_export`.

### Generate A Campaign From VSCode Or Codex

```bash
curl -s -X POST http://127.0.0.1:8102/api/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "product": "Social PR Autopilot",
    "event": "Instagram automation readiness test",
    "audience": "B2B SaaS founders and operators",
    "launch_date": "next week",
    "channels": ["instagram", "telegram", "bluesky", "press"]
  }'
```

Have the agent review the generated Instagram copy before export. This is the right local "human in the loop" point.

### Create An Instagram Scheduling Export

```bash
curl -s -X POST http://127.0.0.1:8102/api/publish \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "instagram",
    "campaign_name": "Instagram Automation Readiness Test",
    "text": "Draft caption from the campaign pack goes here.",
    "image_prompt": "Use supplied article image: /path/to/approved-images/social-pr-autopilot-launch-hero.jpg. Alt text: Dashboard showing automated social campaign generation and publish diagnostics.",
    "link_url": "https://example.com",
    "dry_run": false
  }'
```

This creates an export record, not a direct Instagram post. The response should include:

- `status`: `exported`
- `channel`: `instagram`
- `publish_log_id`: the ID to use for debugging or retry tests
- `next_action`: the operational instruction for the next step
- `diagnostics`: account/config information for troubleshooting

Attach the supplied image manually in Meta Business Suite while the app is in export mode. The export payload should tell the operator which image file to use and what alt text/credit should accompany it.

### Inspect Logs After Every Agent Action

```bash
curl http://127.0.0.1:8102/api/publish-logs
curl http://127.0.0.1:8102/debug
```

Codex should use these logs to explain what happened, what failed, and what to fix next. This is the local version of the future cloud audit trail.

### Suggested Codex Prompt

Use a prompt like this inside VSCode:

```text
Act as the local operator for Social PR Autopilot. Do not publish directly to Instagram. First check /ready and /api/channels/instagram/diagnostics. Then generate a campaign pack for the launch brief I give you. Use the supplied article image path and credit/alt text; do not invent a new image unless I explicitly ask. Create an Instagram scheduling export only after showing me the caption, selected image path, image credit, and alt text. After the export, inspect /api/publish-logs and summarize the publish_log_id, status, diagnostics, and next_action. Never reveal or print access tokens.
```

## Direct Publishing Readiness

Before Social PR Autopilot should call Instagram publishing endpoints, add:

- OAuth onboarding instead of pasted tokens.
- Encrypted token storage.
- Token expiry/reconnect handling.
- GCP Secret Manager or database-backed credential storage.
- App Review/Advanced Access for every permission used by non-admin/customer accounts.
- `instagram_content_publish` in the requested permission set.
- A public HTTPS media asset pipeline for supplied article images, likely GCS-backed.
- A `media_url` or durable asset ID field in publish requests so the backend can pass validated images to Meta.
- Image/video validation before calling Meta.
- Separate logged steps for media container creation, status polling, and publish.
- Durable publish logs and retry state in a database.
- A feature flag that keeps direct publish disabled until several real posts have been manually verified.

The safe direct-publish sequence later is:

1. `POST /<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media`
2. Poll or check the media container status.
3. `POST /<INSTAGRAM_BUSINESS_ACCOUNT_ID>/media_publish`

## Cloud Automation Path

When local export mode is reliable, move toward full autonomous cloud posting in phases.

### Phase A: Cloud-Ready But Approval-Gated

- Deploy the backend to Cloud Run.
- Store Meta credentials in Secret Manager, not `.env`.
- Store runs and publish logs in a database.
- Keep Instagram in export-only mode.
- Let Cloud Scheduler trigger campaign generation.
- Require a human approval field before any Instagram direct-publish call is allowed.

### Phase B: Direct Publishing With Guardrails

- Add a direct Instagram adapter behind `INSTAGRAM_DIRECT_PUBLISH_ENABLED=false` by default.
- Add `instagram_content_publish` to the OAuth scope only after App Review readiness.
- Upload supplied article images to a stable public HTTPS location, such as GCS with controlled signed/public URLs.
- Validate media dimensions, MIME type, file size, caption length, URL fetchability, and Meta account IDs before creating media containers.
- Log media container creation, status polling, publish calls, Meta response IDs, and retry decisions as separate records.
- Require manual approval for the first several production posts.

### Phase C: Fully Autonomous Agent

- Run a scheduled content agent that generates ideas and captions around supplied article images.
- Run a policy agent that checks brand voice, banned claims, CTA rules, hashtags, and posting frequency.
- Run a media-readiness agent that checks supplied image availability, dimensions, MIME type, alt text, credit, and public fetchability.
- Run a channel-health agent that checks token health, Page/Instagram connection, rate limits, failed publishes, and stale media containers.
- Publish only when all checks pass.
- Auto-open a debugging task when Meta returns permission, token, media, or rate-limit errors.
- Keep a kill switch that immediately disables direct Instagram publishing across all tenants.

For the fully automated version, Codex/AI should not hold raw tokens in chat context. It should operate through backend endpoints, secret-backed runtime config, and structured logs.

## Common Failures

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `/me/accounts` returns no Pages | Facebook user lacks Page access, token lacks `pages_show_list`, or wrong Facebook account is signed in | Grant Page access, regenerate the token, and sign in with the right Facebook user |
| Correct Page appears but tasks are weak/missing | User has partial access but cannot create/manage content | Grant full Facebook access or task access with content/management capability |
| Page appears but `instagram_business_account` is missing | Instagram account is not connected to that Page or is not Professional | Reconnect the Instagram account to the Page and confirm it is Business/Creator |
| Works in Graph API Explorer but not in app | App Login/OAuth config differs from Explorer or redirect URI is wrong | Compare app ID, scopes, redirect URI, and token debugger output |
| Works for app admin but not customers | App is in Development Mode or lacks Advanced Access/App Review | Add testers for dev, or complete App Review and switch to Live Mode |
| Meta's "Generate access tokens" screen says to add an Instagram tester | You are probably in `Instagram > API Setup with Instagram Login`, not the Facebook Login path this guide uses | Use Graph API Explorer for a Facebook User token, or switch the app setup to **API Setup with Facebook Login** for the Page-linked account path |
| Token generator creates a token but `/me/accounts` does not work | Token type/path mismatch, wrong app, wrong user, missing `pages_show_list`, or the Facebook user lacks Page Tasks | Regenerate a User token in Graph API Explorer from the Social PR Autopilot app with `instagram_basic` + `pages_show_list` |
| Webhook setup appears before token discovery is proven | Meta's Instagram Login setup bundles test tokens and webhook setup, but webhooks are not needed for this project's first readiness check | Skip webhooks until the Page ID, Instagram business account ID, and access token pass the Graph API Explorer checklist |
| Meta says "Some permissions have been restricted and won't be requested from users of this app" | Restricted permissions were selected before the app has the right access level, App Review, app mode, or template setup | For local setup, remove broad/restricted permissions and keep only `instagram_basic` + `pages_show_list`; for publishing permissions, complete the direct-publish adapter and App Review path first |
| Consent screen does not show a permission you selected | Meta filtered it out because it is restricted, dependent on another permission, unavailable for the app mode, or not approved | Check the app's permission access level, app roles, Development vs Live Mode, and whether the permission belongs in the later direct-publishing phase |
| Graph API Explorer tests pass but local diagnostics fail | Backend did not load the new `.env`, values were added to the wrong `.env`, or the backend is running from an old process | Put values in the repo root `.env`, restart the backend, then call `/api/channels/instagram/diagnostics` again |
| `/debug_token` does not show expected scopes | Token was generated from the wrong app, wrong user, or wrong permission picker state | Select the Social PR Autopilot Meta app, choose User Token, add only `instagram_basic` + `pages_show_list`, and regenerate |
| `/me/accounts?fields=id,name,tasks` returns the Page but no useful tasks | Facebook user can see the Page but cannot create/manage content | Grant `CREATE_CONTENT` or `MANAGE` access through Page access or Business Settings |
| Meta says "The website you entered seems broken. Check the URL to make sure it's correct." | The website/app domain or OAuth redirect URL does not resolve cleanly, is not HTTPS, is a Netlify preview URL Meta cannot validate consistently, has a typo, or points to a frontend route instead of a real backend callback | Use the production Netlify URL or custom domain, confirm it loads publicly over HTTPS, add the exact domain in App Domains, add the exact callback URL in Valid OAuth Redirect URIs, and make sure the callback path exists or use Graph API Explorer for local setup |
| Token stops working | Token expired, user changed password, app access was revoked, or permissions changed | Reconnect and rotate the stored token |
| Future media container fails | Media URL is private, expired, redirects oddly, or has unsupported file properties | Use stable public HTTPS media URLs and validate before container creation |

## Official References

- Meta Create a Meta App for Instagram Platform: https://developers.facebook.com/docs/instagram-platform/create-an-instagram-app
- Meta Instagram API with Instagram Login: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
- Meta Instagram API with Facebook Login get-started: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started
- Meta Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Meta IG User Media reference: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
- Meta long-lived access tokens: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/
- Meta Graph API Explorer: https://developers.facebook.com/tools/explorer/
- Meta Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/
