# VSCode / AI-Driven Instagram Posting — Tooling Evaluation

Created: 2026-05-11
Context: Evaluates three approaches (CLI, Composio MCP, CodeSnap + Browser) against the existing Social PR Autopilot stack to determine whether any are worth integrating, replacing, or ignoring.

---

## Current Stack Baseline

Social PR Autopilot already has:

- A **FastAPI backend** (`social-pr-autopilot/backend/`) with channel adapters, publish logs, diagnostics, and rate-limit tracking.
- A **Next.js frontend** (`social-pr-autopilot/frontend/`) with a campaign dashboard.
- An **Instagram adapter** in export/scheduling mode, with a documented upgrade path to direct Graph API publishing (see [instagram-graph-api-priority-plan-v2.md](instagram-graph-api-priority-plan-v2.md)).
- Publish logs at `/api/publish-logs` with `status`, `diagnostics`, `retryable`, and `next_action` fields.
- Per-channel diagnostics at `/api/channels/instagram/diagnostics`.
- A path to `POST /<IG_USER_ID>/media` + `media_publish` once `INSTAGRAM_DIRECT_PUBLISH_ENABLED=true`.

The question is whether any of the three proposed tools offer something the current stack lacks or can reach a working direct-publish state faster.

---

## Option 1 — CLI (`ig-upload` / `instagram-cli`)

### What It Claims

Install `ig-upload` via npm or `instagram-cli` via Python, then run one command from the VS Code terminal to post an image with a caption.

### Evaluation

| Factor | Assessment |
| --- | --- |
| **API legitimacy** | Both tools use the **unofficial private Instagram API** (reverse-engineered mobile app endpoints), not the official Instagram Graph API. Meta actively detects and blocks unofficial API traffic. |
| **Account risk** | Using unofficial APIs violates Instagram's Terms of Service. Accounts can be temporarily or permanently restricted, especially business accounts. The risk is unacceptable for a production PR/marketing tool. |
| **Maintenance** | Unofficial API wrappers break whenever Meta updates its mobile app. Neither `ig-upload` nor `instagram-cli` is an officially maintained Meta product. |
| **2FA / login friction** | These tools typically require storing your Instagram username and password in plaintext or a config file, which conflicts with the project's existing pattern of using long-lived Graph API tokens stored in Secret Manager. |
| **Fit with current stack** | None. The current backend already has an adapter pattern, publish logs, and a clean upgrade path to the official Graph API. Bolting an unofficial CLI onto this would bypass all of those guardrails. |

### Verdict

**Do not integrate.** The unofficial API risk to a business Instagram account outweighs any convenience gain. The current export mode is safer for the same use case (posting from a local environment before App Review).

---

## Option 2 — Composio MCP (AI-Integrated)

### What It Claims

Install the Composio VS Code extension, authenticate Instagram through it, then prompt GitHub Copilot or another AI agent to screenshot code and post it directly.

### Evaluation

| Factor | Assessment |
| --- | --- |
| **API legitimacy** | Composio connects to Instagram via the **official Graph API** using OAuth. This is the same API the current stack targets. No ToS risk. |
| **Relevance to this project** | Social PR Autopilot is already an MCP-adjacent agent workflow running in VS Code/Codex. Adding Composio would be a **competing orchestration layer** on top of an existing one, not a complement. |
| **Control and auditability** | Composio manages the OAuth token and publish calls on their infrastructure. The current stack's explicit goals include durable publish logs, a kill switch, feature flags, and no raw tokens in chat context. Composio abstracts all of that away, making it harder to audit or debug. |
| **Content type fit** | Composio's selling point is code screenshot → Instagram post. The current stack's use case is article-image-based PR posts with supplied images, credits, alt text, and brand-voice validation. The Composio prompt (`"screenshot my function and post it"`) does not cover that workflow. |
| **Rate limit / quota awareness** | Unknown whether Composio checks `content_publishing_limit` before publishing or handles `EXPIRED` containers. The current plan explicitly requires this check before every publish. |
| **Useful signal** | The approach confirms that **MCP + official Graph API** is a viable pattern in 2026. This validates the direction Social PR Autopilot is already taking, just with Composio as the MCP server instead of a custom backend. |

### Verdict

**Do not integrate as-is.** But the pattern is worth watching. If the current direct-publish adapter proves difficult to maintain, the Composio MCP server could eventually serve as the Instagram transport layer while the Social PR Autopilot backend handles campaign logic, brand validation, and publish logs on top of it. That is a phase 3+ consideration, not an immediate upgrade.

**Potential upgrade path:** evaluate whether Composio exposes a programmatic API or webhook that the Social PR Autopilot backend could call rather than replacing it entirely. Only pursue this if the custom adapter proves unmaintainable.

---

## Option 3 — CodeSnap + VS Code Simple Browser

### What It Claims

Use the CodeSnap extension to generate a code screenshot, then open `instagram.com` in VS Code's built-in Simple Browser to upload and post the image.

### Evaluation

| Factor | Assessment |
| --- | --- |
| **API legitimacy** | This is manual posting through the Instagram web UI. No API, no automation risk. |
| **Relevance to this project** | Social PR Autopilot's Instagram use case is article images with captions, not code screenshots. CodeSnap does not apply. |
| **Automation potential** | Zero. This is a fully manual workflow. It offers nothing the current scheduling export mode doesn't already provide (export → manually post via Meta Business Suite). |
| **VS Code Simple Browser limitation** | The Simple Browser does not support file uploads in all environments. Instagram's web uploader requires a full browser with camera/file access permissions that the embedded browser may not have. |
| **Genuine use case** | If the project ever wants to post code screenshots to Instagram (e.g., showcasing a feature), CodeSnap is the right tool to generate the image asset. That image would then be validated and published through the Social PR Autopilot Graph API adapter, not manually through the browser. |

### Verdict

**Not applicable to this project's core workflow.** CodeSnap could produce image assets for the campaign pipeline, but the posting step should go through the existing adapter, not a browser. Ignore the Simple Browser approach entirely.

---

## Comparative Summary

| Approach | Official API | Account Risk | Automation | Fits Current Stack | Recommended |
| --- | --- | --- | --- | --- | --- |
| CLI (`ig-upload`) | No (unofficial) | High | Yes | No | No |
| Composio MCP | Yes (Graph API) | Low | Yes | Partial overlap | No (yet) |
| CodeSnap + Browser | N/A (manual) | None | No | No | No |
| Current stack (export mode → Graph API adapter) | Yes | Low | Yes | Native | Yes |

---

## Recommended Upgrade Actions

None of the three options replaces or materially accelerates the current roadmap. The highest-value next steps remain inside the existing stack:

1. **Enable direct Graph API publishing** behind `INSTAGRAM_DIRECT_PUBLISH_ENABLED=true` once the IG business account ID, Page ID, and long-lived token pass diagnostics (see [instagram-graph-api-priority-plan-v2.md](instagram-graph-api-priority-plan-v2.md)).
2. **Add `content_publishing_limit` to diagnostics** so the dashboard shows remaining quota before any publish attempt.
3. **Add image validation** (JPEG, ≤ 8 MB, 4:5–1.91:1 aspect ratio) as a pre-publish check in the backend adapter.
4. **Revisit Composio** in phase 3 if maintaining the custom Graph API adapter becomes a burden — it could serve as the transport layer while Social PR Autopilot handles campaign logic on top.

---

## References

- [instagram-graph-api-priority-plan-v2.md](instagram-graph-api-priority-plan-v2.md) — current Graph API readiness plan
- [phase-2.md](phase-2.md) — existing channel adapter scope
- [connect-instagram-account.md](connect-instagram-account.md) — account setup guide
- Composio docs: https://composio.dev/
- Meta Instagram Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
