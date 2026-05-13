# AI News → Article → Instagram Pipeline

Created: 2026-05-12

End-to-end automation: fetch the latest AI news, generate a tastytechbytes.com-style article (route file + image), and publish a matching Instagram post — all on free/low-cost tiers using existing infrastructure plus Gemini and Mistral.

---

## Goals

1. **Discover** trending AI stories every day with zero manual curation.
2. **Generate** a new article in the tastytechbytes.com voice that mirrors the structure of existing routes (e.g. [what-is-rag.tsx](../../../../ttb8/app/routes/what-is-rag.tsx), [5-ways-to-enhance-rag-efficiency-with-dspy.tsx](../../../../ttb8/app/routes/5-ways-to-enhance-rag-efficiency-with-dspy.tsx)).
3. **Create a square hero image** suitable for both the article OG card and the Instagram feed.
4. **Publish** to @tastytechbytes via the existing `/api/publish` Instagram pipeline.
5. **Stay on free tiers** — Gemini free tier (gemini-2.0-flash + Imagen via AI Studio limits), Mistral free tier, Cloudflare tunnel, local FastAPI.

---

## Big Picture

```
                ┌─────────────────────────────────────────┐
                │  cron / manual trigger (daily 09:00 PT) │
                └─────────────────────┬───────────────────┘
                                      ▼
            ┌──────────────────────────────────────────────┐
            │  POST /api/ai-news/run    (new endpoint)     │
            └──────┬───────────────────────────────────────┘
                   ▼
   ┌──────────────────────────────┐
   │ 1. discover_ai_stories()     │  RSS + HN + arXiv → top 5
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ 2. pick_story()              │  Gemini ranks by ttb fit
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ 3. generate_article()        │  Mistral → JSON article body
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ 4. render_route_tsx()        │  fills ttb8 article template
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ 5. generate_hero_image()     │  Gemini Imagen → 1080×1080
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ 6. write_to_ttb8()           │  drops .tsx + image into ttb8
   │                              │  appends to routes.ts + ai-articles.tsx
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ 7. compose_caption()         │  Gemini → 2200-char IG caption
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ 8. POST /api/publish         │  existing pipeline → live IG post
   └──────────────┬───────────────┘
                  ▼
              media_id, route URL,
              publish_log_id returned
```

Every step is a function in one new module: `backend/app/ai_news_pipeline.py`. The publish step reuses [channel_adapters.py](../backend/app/channel_adapters.py) untouched.

---

## What's Already in Place (Reuse This)

| Capability | Where | How we use it |
|---|---|---|
| Multi-provider AI text | [ai_providers.py](../backend/app/ai_providers.py) `generate_text()` | All article + caption generation |
| FastAPI app + routes | [main.py](../backend/app/main.py) | Add one new POST route |
| Instagram publish (3-step Meta flow) | [channel_adapters.py](../backend/app/channel_adapters.py) `_publish_instagram()` | Unchanged — call via `/api/publish` |
| Image → public URL | [media.py](../backend/app/media.py) `local_path_to_public_jpeg()` | Drop generated image into `MEDIA_DIR`, reuse |
| Cloudflare tunnel exposing `MEDIA_DIR` | [instagram-pipeline-summary.md](instagram-pipeline-summary.md) | Meta fetches hero image from here |
| Rate limit + publish logs | [runtime.py](../backend/app/runtime.py) | Same `PUBLISH_LOGS` ring buffer |
| ttb8 article route pattern | [ttb8/app/routes.ts](../../../../ttb8/app/routes.ts) + existing `.tsx` files | Article template mirrors `what-is-rag.tsx` |

**No changes** to: `channel_adapters.py`, `media.py`, `runtime.py`, `http_clients.py`, the Meta tokens, the tunnel, or any frontend.

---

## What's New (One Module + One Route)

### `backend/app/ai_news_pipeline.py` (new)

All eight pipeline steps live here. Public surface:

```python
async def run_ai_news_pipeline(
    *,
    dry_run: bool = False,
    publish: bool = True,
    source_override: list[str] | None = None,
) -> AiNewsRunResult: ...
```

Internal helpers (private, one responsibility each):

| Function | Returns | Notes |
|---|---|---|
| `discover_ai_stories()` | `list[Story]` | Pulls from RSS_FEEDS + HN Algolia API + arXiv `cs.AI`. Free, no key. |
| `_dedupe_stories(stories)` | `list[Story]` | URL hash diff vs. `STORIES_SEEN` (ring buffer, last 500) |
| `pick_story(stories)` | `Story` | Calls `generate_text()` with a "which is most ttb-flavored" prompt; returns the chosen URL |
| `generate_article(story)` | `Article` | Mistral preferred (cheaper, JSON-mode friendly). Returns title, slug, sections, og_description, keywords. |
| `render_route_tsx(article, image_filename)` | `str` | Plain string templating — no JSX library needed. Mirrors `what-is-rag.tsx` exactly. |
| `generate_hero_image(article)` | `Path` | Gemini `imagen-3.0-fast-generate-001` → 1080×1080 PNG → `local_path_to_public_jpeg()` |
| `write_to_ttb8(article, route_tsx, image_path)` | `WriteResult` | Drops files into `$TTB8_REPO/app/routes/` and `$TTB8_REPO/public/`. Appends one line to `routes.ts` and one entry to `ai-articles.tsx`. |
| `compose_caption(article, story)` | `str` | ≤ 2200 chars, ends with `#tastytechbytes` + 3 topical hashtags |

### `backend/app/main.py` (one addition)

```python
@app.post("/api/ai-news/run", response_model=AiNewsRunResult)
async def ai_news_run(payload: AiNewsRunRequest) -> AiNewsRunResult:
    return await run_ai_news_pipeline(
        dry_run=payload.dry_run,
        publish=payload.publish,
        source_override=payload.sources,
    )
```

### `backend/app/models.py` (three additions)

`Story`, `Article`, `AiNewsRunRequest`, `AiNewsRunResult` — all frozen Pydantic models. `AiNewsRunResult` contains: `story_url`, `article_slug`, `route_file`, `image_filename`, `caption`, `publish_log_id`, `media_id`, `dry_run`.

---

## Step Details

### 1. discover_ai_stories()

Free sources, no API keys required:

| Source | URL | Why |
|---|---|---|
| HN front page (AI filter) | `https://hn.algolia.com/api/v1/search?tags=front_page&query=AI` | Best signal for dev-focused AI news |
| arXiv cs.AI | `http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10` | Research-flavored stories |
| Hugging Face daily papers | `https://huggingface.co/api/daily_papers` | Trending model releases |
| Anthropic / OpenAI / Google blog RSS | Standard `/rss` endpoints | Tier-1 announcements |

Cap at 5 stories. Each `Story` = `{url, title, summary, source, published_at}`.

### 2. pick_story()

One Gemini call. Prompt template:

```
You are the editor of tastytechbytes.com, a blog for developers building with AI.
Recent articles cover: RAG, DSPy, neural networks, Three.js, framework comparisons.
From the candidates below, return the URL of the single story that best matches our voice
(technical depth, framework-aware, ~5-minute read potential, novelty in last 7 days).

Candidates:
1. <title> — <summary> — <url>
...

Output only the chosen URL on a single line.
```

If the response isn't a valid URL from the list, fall back to candidate #1.

### 3. generate_article()

Mistral with JSON mode (`response_format={"type": "json_object"}`). Prompt requests:

```json
{
  "title": "...",
  "slug": "kebab-case-slug",
  "subtitle": "one-liner under the H1",
  "og_description": "≤ 160 chars",
  "keywords": ["AI", "..."],
  "sections": [
    {"heading": "Introduction", "paragraphs": ["..."]},
    {"heading": "...", "paragraphs": ["..."]}
  ],
  "image_prompt": "Imagen prompt for the hero card — square, abstract-tech, no text"
}
```

5–7 sections. Each paragraph 2–4 sentences. No invented citations.

### 4. render_route_tsx()

A pure Python f-string template that produces a `.tsx` file structurally identical to [what-is-rag.tsx](../../../../ttb8/app/routes/what-is-rag.tsx): same `meta` export (title, og, twitter, linkedin, keywords), same Tailwind layout (`min-h-screen bg-gray-100`, blue header, `font-serif` body). The image import becomes `import hero from "/${slug}.jpg"`.

No JSX parser needed — the template is dumb string interpolation. HTML-escape user-provided fields.

### 5. generate_hero_image()

Gemini Imagen call:

```
POST https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:predict
  ?key=$GEMINI_API_KEY
  body: { "instances": [{ "prompt": "<article.image_prompt>, square 1:1, no text, no logos" }],
          "parameters": { "sampleCount": 1, "aspectRatio": "1:1" } }
```

Response is base64 PNG → write to `MEDIA_DIR/<slug>.png` → call `local_path_to_public_jpeg()` (existing) to convert + validate aspect ratio.

**Fallback if Imagen quota hits**: use [Pollinations](https://pollinations.ai) (`https://image.pollinations.ai/prompt/<encoded-prompt>?width=1080&height=1080`) — free, no key, no auth. Save the bytes the same way.

### 6. write_to_ttb8()

Three filesystem writes inside `$TTB8_REPO` (env var, defaults to `/Users/adamaslan/code/ttb8`):

1. `app/routes/<slug>.tsx` ← from step 4
2. `public/<slug>.jpg` ← from step 5
3. **Append** one line to `app/routes.ts`:
   `route("<slug>", "./routes/<slug>.tsx"),` inserted before the closing `]`.
4. **Append** one entry to `app/routes/ai-articles.tsx` `articles` array.

All edits are append-only — never modify existing entries. If `<slug>.tsx` already exists, abort with `DuplicateArticleError` (treat as success-with-noop in the response).

### 7. compose_caption()

Gemini, single call:

```
Write an Instagram caption for tastytechbytes.com promoting this article.
Title: <article.title>
Summary: <article.og_description>
Constraints:
- ≤ 2100 chars (leaves room for hashtags)
- 3 short paragraphs separated by blank lines
- No emoji walls — at most 2 emoji total
- End with: "Full read at tastytechbytes.com/<slug>"
- After that, append: "#tastytechbytes #AI #<topical1> #<topical2> #<topical3>"
```

Sanity-check length ≤ 2200 before returning.

### 8. POST /api/publish

Internal HTTP call to the existing route:

```python
await http_client().post("http://127.0.0.1:8102/api/publish", json={
    "channel": "instagram",
    "campaign_name": f"AI News — {article.slug}",
    "text": caption,
    "local_image_path": f"{article.slug}.jpg",
    "alt_text": article.og_description,
    "link_url": f"https://tastytechbytes.com/{article.slug}",
    "dry_run": dry_run,
})
```

The existing pipeline handles container creation, polling, publishing, rate limits, and logging. We just collect `publish_log_id` and `external_id` from the response.

---

## Environment Variables

Adds to the existing `.env` — nothing replaced.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Already present for `ai_providers.py`. Reused for Imagen. |
| `MISTRAL_API_KEY` | Yes | — | Already present. Used for article body. |
| `TTB8_REPO_PATH` | Yes | `/Users/adamaslan/code/ttb8` | Where article files are written |
| `AI_NEWS_SOURCES` | No | `hn,arxiv,hf,blogs` | Comma-list of enabled discovery sources |
| `AI_NEWS_MAX_CANDIDATES` | No | `5` | Stories shown to picker |
| `AI_NEWS_IMAGE_PROVIDER` | No | `gemini` | `gemini` \| `pollinations` |
| `AI_NEWS_DRY_RUN_DEFAULT` | No | `false` | If `true`, route always treats unspecified `dry_run` as true |

---

## Free Tier Math

| Provider | Free quota | Pipeline usage / run | Runs/day on free tier |
|---|---|---|---|
| Gemini 2.0 Flash | 15 RPM, 1500 RPD | 2 calls (picker + caption) | ~750 |
| Gemini Imagen 3 Fast (AI Studio) | Limited preview — ~50/day | 1 call | ~50 |
| Mistral Free | 1 RPS, 500k tokens/month | 1 call (~3k tokens) | ~160 (token-bound) |
| Pollinations (image fallback) | Unlimited, unauth | 1 call when Imagen quota hit | ∞ |
| Meta IG Graph API | 100 posts / 24 h | 1 post | 100 |

**Daily cadence (1 run/day) costs $0.** Image quota is the binding constraint; Pollinations covers any overflow.

---

## Operator Commands

### Dry-run end-to-end (writes files, skips IG)

```bash
curl -s -X POST http://127.0.0.1:8102/api/ai-news/run \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "publish": false}' | python3 -m json.tool
```

This produces the `.tsx` route, the hero image, and the caption — but never calls `/api/publish`. Lets you review before going live.

### Full live run

```bash
curl -s -X POST http://127.0.0.1:8102/api/ai-news/run \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false, "publish": true}'
```

### Daily automation (macOS launchd)

`~/Library/LaunchAgents/com.tastytechbytes.ai-news.plist` triggers the curl above at 09:00 local. Backend must be running with the tunnel up. Log to `~/Library/Logs/ttb-ai-news.log`.

---

## Failure Modes & Handling

| Stage | Failure | Behavior |
|---|---|---|
| Discovery | All sources down | Abort with 503; no log entry created |
| Picker | Gemini returns garbage | Fall back to first candidate; log warning |
| Article gen | Mistral fails | Retry once with Gemini via `generate_text()` fallback chain (already built into `ai_providers.py`) |
| Image gen | Imagen 4xx/5xx | Auto-switch to Pollinations; record `image_provider_used` in result |
| ttb8 write | Slug exists | Return existing route info, skip publish, status `duplicate` |
| ttb8 write | `routes.ts` malformed | Abort, leave article file orphaned, status `failed_to_register` |
| Publish | Rate-limited / quota | Existing `_check_instagram_quota()` short-circuits; status `rate_limited` |
| Publish | Container ERROR | Existing poll loop reports it; status `failed`, `next_action` populated |

Every run creates one entry in `PUBLISH_LOGS` (via the existing `/api/publish` call) plus one structured `record_event("ai_news_run_complete", ...)` for observability through the existing `/ready` and event log infrastructure.

---

## Why This Stays Cheap and Reuses Everything

- **No new external services**: only the same Gemini + Mistral keys already wired in.
- **No new image hosting**: hero image lives in `MEDIA_DIR`, served by the same `/media/*` static mount, exposed via the same Cloudflare tunnel that already serves IG.
- **No new auth**: ttb8 writes are local filesystem operations into a sibling repo.
- **No new dependencies**: `httpx`, `pydantic`, `Pillow` are already in [requirements.txt](../backend/requirements.txt).
- **No DB**: discovery dedupe and story memory live in the same in-memory ring buffer pattern as `RUNS` and `PUBLISH_LOGS`.

---

## File Manifest

New:
- `backend/app/ai_news_pipeline.py` — eight functions, ~400 lines
- `docs/ai-news-to-instagram-pipeline.md` — this doc

Modified (additive only):
- `backend/app/main.py` — one new POST route, one import
- `backend/app/models.py` — four new Pydantic models
- `.env.example` — four new vars documented

Untouched: every existing channel adapter, media helper, runtime store, and the Meta token flow.

---

## Next Steps (if/when you build)

1. Scaffold `ai_news_pipeline.py` with stub functions and the `Story` / `Article` models.
2. Implement `discover_ai_stories()` first — testable in isolation, no AI key needed.
3. Wire `pick_story()` and `compose_caption()` next — smallest LLM surface.
4. Build `render_route_tsx()` against a snapshot of [what-is-rag.tsx](../../../../ttb8/app/routes/what-is-rag.tsx) — compare output as a string-diff test.
5. Add `generate_hero_image()` with Pollinations first, swap to Imagen once that works.
6. Glue with `/api/ai-news/run` and exercise end-to-end in `dry_run=true` for a week before going live.
