"""AI News → Article → Instagram pipeline.

Eight steps:
  1. discover_ai_stories  — RSS / HN / arXiv / HF → candidate list
  2. pick_story           — Gemini ranks, picks the best fit for tastytechbytes
  3. generate_article     — Mistral (JSON mode) → structured Article
  4. render_route_tsx     — f-string template → .tsx file text
  5. generate_hero_image  — Gemini Imagen → 1080×1080 JPEG in MEDIA_DIR
  6. write_to_ttb8        — drops files into ttb8 repo, updates data registry
  7. compose_caption      — Gemini → ≤ 2200-char Instagram caption
  8. publish_to_instagram — calls existing /api/publish endpoint

Routes and article index are driven by a JSON registry file
(ttb8/app/article-registry.json) rather than regex modification of source
files, making updates safe and diff-friendly.
"""

import base64
import html
import json
import logging
import re
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

from .ai_providers import generate_text
from .config import (
    ai_news_dry_run_default,
    ai_news_image_provider,
    ai_news_max_candidates,
    ai_news_sources,
    env_value,
    ttb8_repo_path,
)
from .http_clients import ai_client
from .media import MEDIA_DIR, local_path_to_public_jpeg
from .models import Article, ArticleSection, AiNewsRunResult, Story
from .runtime import APP_NAME, mark_story_seen, record_event, start_run, finish_run, story_already_seen


logger = logging.getLogger(APP_NAME)

_BLOG_RSS_FEEDS = [
    ("anthropic", "https://www.anthropic.com/rss.xml"),
    ("openai", "https://openai.com/blog/rss.xml"),
    ("google-deepmind", "https://deepmind.google/blog/rss/"),
]

# XML namespaces used in Atom feeds (arXiv)
_ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


class DuplicateArticleError(Exception):
    pass


@dataclass
class WriteResult:
    route_file: str
    image_dest: str


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def run_ai_news_pipeline(
    *,
    dry_run: bool | None = None,
    publish: bool = True,
    source_override: list[str] | None = None,
) -> AiNewsRunResult:
    if dry_run is None:
        dry_run = ai_news_dry_run_default()

    run = start_run("ai_news_pipeline", {"dry_run": dry_run, "publish": publish})
    run_id = run["id"]

    try:
        # 1. Discover
        sources = source_override or ai_news_sources()
        stories = await discover_ai_stories(sources)
        if not stories:
            finish_run(run_id, "failed", "No stories discovered")
            return AiNewsRunResult(run_id=run_id, status="no_stories", dry_run=dry_run, error="No stories discovered from any source")

        # 2. Pick
        story = await pick_story(stories)
        record_event("ai_news_story_picked", run_id=run_id, url=story.url, title=story.title)

        # 3. Generate article
        article = await generate_article(story)
        record_event("ai_news_article_generated", run_id=run_id, slug=article.slug)

        # 4. Render route TSX
        route_tsx_text = render_route_tsx(article)

        # 5. Generate hero image
        image_filename, image_provider_used = await generate_hero_image(article)

        # 6. Write to ttb8
        write_result = await write_to_ttb8(article, route_tsx_text, image_filename)
        mark_story_seen(story.url)

        # 7. Compose caption
        caption = await compose_caption(article, story)

        # 8. Publish
        publish_log_id = ""
        media_id = ""
        if publish and not dry_run:
            publish_log_id, media_id = await publish_to_instagram(article, image_filename, caption)

        finish_run(run_id, "completed", f"Published article: {article.slug}")
        return AiNewsRunResult(
            run_id=run_id,
            status="published" if (publish and not dry_run) else "dry_run",
            story_url=story.url,
            story_title=story.title,
            article_slug=article.slug,
            route_file=write_result.route_file,
            image_filename=image_filename,
            image_provider_used=image_provider_used,
            caption=caption,
            publish_log_id=publish_log_id,
            media_id=media_id,
            dry_run=dry_run,
        )

    except DuplicateArticleError as exc:
        finish_run(run_id, "duplicate", str(exc))
        return AiNewsRunResult(run_id=run_id, status="duplicate", dry_run=dry_run, error=str(exc))
    except Exception as exc:
        logger.exception("ai_news_pipeline_failed", extra={"run_id": run_id, "error": str(exc)})
        finish_run(run_id, "failed", "Pipeline failed", str(exc))
        return AiNewsRunResult(run_id=run_id, status="failed", dry_run=dry_run, error=str(exc))


# ---------------------------------------------------------------------------
# Step 1: Discover
# ---------------------------------------------------------------------------


async def discover_ai_stories(sources: list[str]) -> list[Story]:
    max_candidates = ai_news_max_candidates()
    stories: list[Story] = []

    fetchers: dict[str, Any] = {
        "hn": _fetch_hn_stories,
        "arxiv": _fetch_arxiv_stories,
        "hf": _fetch_hf_stories,
        "blogs": _fetch_blog_stories,
    }

    for source_key in sources:
        if source_key not in fetchers:
            logger.warning("ai_news_unknown_source", extra={"source": source_key})
            continue
        try:
            batch = await fetchers[source_key]()
            stories.extend(batch)
        except Exception as exc:
            record_event("ai_news_source_error", level="warning", source=source_key, error=str(exc))

    deduped = _dedupe_stories(stories)
    record_event("ai_news_stories_discovered", count=len(deduped))
    return deduped[:max_candidates]


def _dedupe_stories(stories: list[Story]) -> list[Story]:
    seen_urls: set[str] = set()
    result: list[Story] = []
    for story in stories:
        if story.url in seen_urls or story_already_seen(story.url):
            continue
        seen_urls.add(story.url)
        result.append(story)
    return result


async def _fetch_hn_stories() -> list[Story]:
    url = "https://hn.algolia.com/api/v1/search?tags=front_page&query=AI&hitsPerPage=10"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    hits = resp.json().get("hits", [])
    stories = []
    for hit in hits:
        story_url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
        stories.append(Story(
            url=story_url,
            title=hit.get("title", ""),
            summary=hit.get("story_text") or hit.get("title", ""),
            source="hackernews",
            published_at=hit.get("created_at", ""),
        ))
    return stories


async def _fetch_arxiv_stories() -> list[Story]:
    """Fetch recent AI papers from arXiv using the Atom XML API."""
    url = (
        "http://export.arxiv.org/api/query"
        "?search_query=cat:cs.AI"
        "&sortBy=submittedDate&sortOrder=descending&max_results=5"
    )
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError as exc:
        raise ValueError(f"Failed to parse arXiv Atom feed: {exc}") from exc

    stories = []
    for entry in root.findall("atom:entry", _ATOM_NS):
        title_el = entry.find("atom:title", _ATOM_NS)
        summary_el = entry.find("atom:summary", _ATOM_NS)
        id_el = entry.find("atom:id", _ATOM_NS)
        published_el = entry.find("atom:published", _ATOM_NS)

        if title_el is None or id_el is None:
            continue

        stories.append(Story(
            url=(id_el.text or "").strip(),
            title=(title_el.text or "").strip().replace("\n", " "),
            summary=(summary_el.text or "").strip().replace("\n", " ") if summary_el is not None else "",
            source="arxiv",
            published_at=(published_el.text or "").strip() if published_el is not None else "",
        ))
    return stories


async def _fetch_hf_stories() -> list[Story]:
    url = "https://huggingface.co/api/daily_papers"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    papers = resp.json() if isinstance(resp.json(), list) else []
    stories = []
    for paper in papers[:5]:
        paper_id = paper.get("paper", {}).get("id", "")
        title = paper.get("paper", {}).get("title", "")
        summary = paper.get("paper", {}).get("summary", "")
        if not paper_id or not title:
            continue
        stories.append(Story(
            url=f"https://huggingface.co/papers/{paper_id}",
            title=title,
            summary=summary[:300],
            source="huggingface",
            published_at=paper.get("publishedAt", ""),
        ))
    return stories


async def _fetch_blog_stories() -> list[Story]:
    """Fetch blog posts from RSS feeds using a proper XML parser."""
    stories = []
    async with httpx.AsyncClient(timeout=15) as client:
        for source_name, feed_url in _BLOG_RSS_FEEDS:
            try:
                resp = await client.get(feed_url)
                resp.raise_for_status()
                stories.extend(_parse_rss_feed(resp.text, source_name))
            except Exception as exc:
                record_event("ai_news_blog_feed_error", level="warning", feed=source_name, error=str(exc))
    return stories


def _parse_rss_feed(xml_text: str, source_name: str) -> list[Story]:
    """Parse an RSS 2.0 or Atom feed into Story objects using ElementTree."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise ValueError(f"Failed to parse RSS feed for {source_name}: {exc}") from exc

    # Detect feed type: RSS 2.0 uses <channel><item>, Atom uses <entry>
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    items = root.findall(".//item")  # RSS 2.0
    if not items:
        items = root.findall("atom:entry", ns) or root.findall(".//entry")  # Atom

    stories = []
    for item in items[:2]:
        title_el = item.find("title") or item.find("{http://www.w3.org/2005/Atom}title")
        link_el = item.find("link") or item.find("{http://www.w3.org/2005/Atom}link")
        desc_el = item.find("description") or item.find("{http://www.w3.org/2005/Atom}summary")
        pub_el = item.find("pubDate") or item.find("{http://www.w3.org/2005/Atom}published")

        # <link> in Atom is often an empty tag with href attribute
        if link_el is None:
            continue
        link = (link_el.text or link_el.get("href") or "").strip()
        title = _strip_cdata(title_el.text or "") if title_el is not None else ""
        if not link or not title:
            continue

        desc = _strip_cdata(desc_el.text or "") if desc_el is not None else ""
        pub = (pub_el.text or "").strip() if pub_el is not None else ""
        stories.append(Story(
            url=link,
            title=title,
            summary=desc[:300],
            source=source_name,
            published_at=pub,
        ))
    return stories


def _strip_cdata(text: str) -> str:
    """Remove CDATA wrappers that some RSS feeds include in text content."""
    stripped = text.strip()
    if stripped.startswith("<![CDATA[") and stripped.endswith("]]>"):
        return stripped[9:-3].strip()
    return stripped


# ---------------------------------------------------------------------------
# Step 2: Pick
# ---------------------------------------------------------------------------


async def pick_story(stories: list[Story]) -> Story:
    if len(stories) == 1:
        return stories[0]

    candidates = "\n".join(
        f"{i + 1}. {s.title} — {s.summary[:120]} — {s.url}"
        for i, s in enumerate(stories)
    )
    prompt = f"""You are the editor of tastytechbytes.com, a developer blog covering AI frameworks, LLMs, neural networks, and practical AI tooling.
Recent articles cover: RAG, DSPy, neural networks, Three.js with Web3, framework comparisons, Hugging Face.

From the candidates below, return the URL of the single story that best matches our voice:
- Technical depth appropriate for developers
- Framework-aware or model-aware content
- Novelty — something readers haven't heard yet
- Strong ~5-minute-read potential

Candidates:
{candidates}

Output only the chosen URL on a single line. Nothing else."""

    try:
        raw = await generate_text(prompt, purpose="story_picker")
        chosen_url = raw.strip().split("\n")[0].strip()
        for story in stories:
            if story.url == chosen_url:
                return story
    except Exception as exc:
        record_event("ai_news_pick_story_error", level="warning", error=str(exc))

    # Fallback: first candidate
    return stories[0]


# ---------------------------------------------------------------------------
# Step 3: Generate article
# ---------------------------------------------------------------------------


def _load_existing_articles() -> list[dict[str, str]]:
    """Read title+slug pairs from the article registry for inline linking."""
    registry = _load_article_registry()
    return [{"title": a["title"], "slug": a["slug"]} for a in registry if len(a.get("title", "")) > 10]


async def generate_article(story: Story) -> Article:
    existing = _load_existing_articles()
    existing_list = "\n".join(f'- [{a["title"]}](/{a["slug"]})' for a in existing)

    prompt = f"""You are a technical writer for tastytechbytes.com, a developer blog about AI.

Write a complete article about this story:
Title: {story.title}
Summary: {story.summary}
Source URL: {story.url}

Previously published articles on this site:
{existing_list}

Respond with a JSON object only (no markdown, no code fences) matching this exact shape:
{{
  "title": "Article title (engaging, developer-focused)",
  "slug": "kebab-case-url-slug",
  "subtitle": "One sentence under the H1",
  "og_description": "SEO description, max 160 chars",
  "keywords": ["AI", "keyword2", "keyword3", "keyword4", "keyword5"],
  "sections": [
    {{"heading": "Introduction", "paragraphs": ["paragraph text..."]}},
    {{"heading": "Section 2 heading", "paragraphs": ["para1", "para2"]}},
    {{"heading": "Section 3 heading", "paragraphs": ["para1", "para2"]}},
    {{"heading": "Section 4 heading", "paragraphs": ["para1"]}},
    {{"heading": "Section 5 heading", "paragraphs": ["para1"]}},
    {{"heading": "Conclusion", "paragraphs": ["para1"]}}
  ],
  "image_prompt": "Imagen prompt for a square abstract-tech hero image, no text, no logos"
}}

Inline linking rules — embed these as markdown links directly inside paragraph sentences where they fit naturally:
1. Link to the source story at least once: [{story.title}]({story.url})
2. Link to the single most topically related previous article from the list above — weave it into a sentence where the connection is genuine, not forced. Use its exact title and path as shown.
3. Use markdown link syntax: [visible text](url) — no bare URLs in prose.
4. At most 2 inline links total across the whole article. Never repeat the same URL.

Other rules:
- 5-7 sections including Introduction and Conclusion
- Each paragraph 2-4 sentences
- No invented citations or statistics
- slug must be unique, URL-safe, all lowercase, hyphens only
- keywords list must have 4-6 items"""

    raw = await generate_text(prompt, purpose="article_generation")
    data = _parse_llm_json(raw, context="article_generation")

    sections = [
        ArticleSection(heading=s["heading"], paragraphs=s["paragraphs"])
        for s in data.get("sections", [])
    ]

    return Article(
        title=data["title"],
        slug=_sanitize_slug(data["slug"]),
        subtitle=data.get("subtitle", ""),
        og_description=data.get("og_description", "")[:160],
        keywords=data.get("keywords", [])[:6],
        sections=sections,
        image_prompt=data.get("image_prompt", f"Abstract AI technology hero image for {data['title']}"),
    )


def _parse_llm_json(raw: str, context: str = "") -> dict[str, Any]:
    """Parse JSON from LLM output, tolerating common formatting artifacts.

    LLMs frequently wrap JSON in markdown code fences, add trailing commas,
    or include leading/trailing prose. This function strips the most common
    artifacts before calling json.loads, and raises ValueError with context
    on failure rather than a bare JSONDecodeError.
    """
    text = raw.strip()

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    # Extract the outermost JSON object if there's leading/trailing prose
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start: end + 1]

    # Remove trailing commas before ] or } (common LLM artifact)
    text = re.sub(r",\s*([}\]])", r"\1", text)

    try:
        result = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"LLM output is not valid JSON [{context}]: {exc}\nRaw (first 400 chars): {raw[:400]}"
        ) from exc

    if not isinstance(result, dict):
        raise ValueError(f"LLM JSON is not an object [{context}]: got {type(result).__name__}")

    return result


def _sanitize_slug(raw: str) -> str:
    slug = raw.lower().strip()
    slug = re.sub(r"[^a-z0-9-]", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug)
    return slug.strip("-")


# ---------------------------------------------------------------------------
# Step 4: Render route TSX
# ---------------------------------------------------------------------------


def _md_links_to_jsx(text: str) -> str:
    """Convert [label](url) markdown links to JSX.

    Internal paths (/slug) → <Link to="/slug">label</Link>
    External URLs         → <a href="url" target="_blank" rel="noopener noreferrer">label</a>
    Plain text outside links is HTML-escaped.
    """
    parts = re.split(r"(\[[^\]]+\]\([^)]+\))", text)
    result = []
    for part in parts:
        m = re.match(r"\[([^\]]+)\]\(([^)]+)\)", part)
        if m:
            label = html.escape(m.group(1))
            raw_url = m.group(2)
            if not raw_url.startswith("http"):
                internal = "/" + raw_url.lstrip("/")
                url = html.escape(internal)
                result.append(f'<Link to="{url}" className="text-blue-600 underline">{label}</Link>')
            else:
                url = html.escape(raw_url)
                result.append(f'<a href="{url}" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{label}</a>')
        else:
            result.append(html.escape(part))
    return "".join(result)


def render_route_tsx(article: Article) -> str:
    esc = html.escape
    keyword_str = esc(", ".join(article.keywords))
    slug = article.slug

    sections_jsx = ""
    for section in article.sections:
        heading_esc = esc(section.heading)
        paras_jsx = "\n          ".join(
            f'<p className="mt-2 text-left text-lg tracking-tight sm:text-xl lg:text-2xl font-serif">{_md_links_to_jsx(p)}</p>'
            for p in section.paragraphs
        )
        sections_jsx += f"""
        <section className="mb-8">
          <h2 className="text-left text-lg tracking-tight sm:text-2xl lg:text-3xl font-serif font-bold mb-4">{heading_esc}</h2>
          {paras_jsx}
        </section>
"""

    return f"""import React from 'react';
import {{ Link }} from 'react-router';
import hero from "/{slug}.jpg";
import type {{ MetaFunction }} from 'react-router';

export const meta: MetaFunction = () => {{
  return [
    {{ title: "{esc(article.title)}" }},
    {{ property: "og:image", content: hero }},
    {{ property: "og:title", content: "{esc(article.title)}" }},
    {{ property: "og:description", content: "{esc(article.og_description)}" }},
    {{ property: "og:type", content: "article" }},
    {{ property: "twitter:card", content: "summary_large_image" }},
    {{ property: "twitter:title", content: "{esc(article.title)}" }},
    {{ property: "twitter:description", content: "{esc(article.og_description)}" }},
    {{ property: "twitter:image", content: hero }},
    {{ property: "linkedin:title", content: "{esc(article.title)}" }},
    {{ property: "linkedin:description", content: "{esc(article.og_description)}" }},
    {{ property: "linkedin:image", content: hero }},
    {{ property: "keywords", content: "{keyword_str}" }},
  ];
}};

const RemixPage = () => {{
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-blue-600 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">{esc(article.title)}</h1>
          <p className="mt-2">{esc(article.subtitle)}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {sections_jsx}
        <p className="text-center text-blue-500 text-lg">
          <Link to="/">Go back to Home</Link>
        </p>
      </main>

      <footer className="bg-gray-200 py-4 text-center">
        <p className="text-sm">&copy; 2025 TastyTechBytes. All rights reserved.</p>
      </footer>
    </div>
  );
}};

export default RemixPage;
"""


# ---------------------------------------------------------------------------
# Step 5: Generate hero image
# ---------------------------------------------------------------------------


async def generate_hero_image(article: Article) -> tuple[str, str]:
    provider = ai_news_image_provider()
    dest_name = f"{article.slug}.jpg"

    if provider == "gemini":
        try:
            return await _generate_image_gemini(article, dest_name)
        except Exception as exc:
            record_event("ai_news_imagen_failed", level="warning", error=str(exc), fallback="pollinations")

    return await _generate_image_pollinations(article, dest_name)


async def _generate_image_gemini(article: Article, dest_name: str) -> tuple[str, str]:
    api_key = env_value("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "imagen-3.0-fast-generate-001:predict"
        f"?key={api_key}"
    )
    payload = {
        "instances": [{"prompt": f"{article.image_prompt}, square 1:1, no text, no logos, abstract digital art"}],
        "parameters": {"sampleCount": 1, "aspectRatio": "1:1"},
    }
    response = await ai_client().post(url, json=payload, timeout=60)
    response.raise_for_status()

    data = response.json()
    try:
        b64 = data["predictions"][0]["bytesBase64Encoded"]
        image_bytes = base64.b64decode(b64)
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError(f"Gemini Imagen API returned an unexpected response format: {data}") from exc

    png_path = MEDIA_DIR / f"{uuid.uuid4().hex}.png"
    png_path.write_bytes(image_bytes)

    try:
        jpeg_name = local_path_to_public_jpeg(png_path.name)
    finally:
        if png_path.exists():
            png_path.unlink()

    final_path = MEDIA_DIR / dest_name
    current_path = MEDIA_DIR / jpeg_name
    if current_path != final_path:
        current_path.rename(final_path)

    return dest_name, "gemini_imagen"


async def _generate_image_pollinations(article: Article, dest_name: str) -> tuple[str, str]:
    import urllib.parse
    prompt_encoded = urllib.parse.quote(f"{article.image_prompt}, abstract digital art, no text")
    url = f"https://image.pollinations.ai/prompt/{prompt_encoded}?width=1080&height=1080&nologo=true"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url, follow_redirects=True)
        resp.raise_for_status()

    png_path = MEDIA_DIR / f"{uuid.uuid4().hex}.png"
    png_path.write_bytes(resp.content)

    try:
        jpeg_name = local_path_to_public_jpeg(png_path.name)
    finally:
        if png_path.exists():
            png_path.unlink()

    final_path = MEDIA_DIR / dest_name
    current_path = MEDIA_DIR / jpeg_name
    if current_path != final_path:
        current_path.rename(final_path)

    return dest_name, "pollinations"


# ---------------------------------------------------------------------------
# Step 6: Write to ttb8
# ---------------------------------------------------------------------------

# Registry schema: list of {"slug": str, "title": str, "og_description": str, "image": str}
# The registry is the single source of truth consumed by routes.ts and ai-articles.tsx
# via a build-time codegen step, avoiding fragile regex surgery on source files.
_REGISTRY_FILENAME = "article-registry.json"


def _registry_path() -> Path:
    repo = ttb8_repo_path()
    if not repo:
        raise ValueError("TTB8_REPO_PATH is not set — cannot locate article registry")
    return Path(repo) / "app" / _REGISTRY_FILENAME


def _load_article_registry() -> list[dict[str, Any]]:
    path = _registry_path()
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save_article_registry(entries: list[dict[str, Any]]) -> None:
    path = _registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


async def write_to_ttb8(article: Article, route_tsx: str, image_filename: str) -> WriteResult:
    repo = ttb8_repo_path()
    if not repo:
        raise ValueError("TTB8_REPO_PATH is not set")

    ttb8 = Path(repo)
    routes_dir = ttb8 / "app" / "routes"
    public_dir = ttb8 / "public"

    route_file = routes_dir / f"{article.slug}.tsx"
    if route_file.exists():
        raise DuplicateArticleError(f"Article already exists: {route_file}")

    # Write .tsx route
    route_file.write_text(route_tsx, encoding="utf-8")
    record_event("ai_news_route_written", slug=article.slug, path=str(route_file))

    # Copy image from MEDIA_DIR to ttb8 public/
    src_image = MEDIA_DIR / image_filename
    dest_image = public_dir / image_filename
    if src_image.exists():
        dest_image.write_bytes(src_image.read_bytes())
        record_event("ai_news_image_copied", dest=str(dest_image))

    # Update the article registry (single source of truth for routes + index)
    _register_article(article, image_filename)

    return WriteResult(route_file=str(route_file), image_dest=str(dest_image))


def _register_article(article: Article, image_filename: str) -> None:
    """Append the new article to the JSON registry.

    The registry is consumed at build time by two generated files:
      - app/routes.ts     (via `npm run codegen:routes`)
      - app/routes/ai-articles.tsx  (via `npm run codegen:articles`)

    Keeping registration as a pure JSON write means this pipeline never
    needs to parse or modify TypeScript/JSX source directly.
    """
    entries = _load_article_registry()

    # Idempotent: skip if slug already registered
    if any(e.get("slug") == article.slug for e in entries):
        return

    entries.insert(0, {
        "slug": article.slug,
        "title": article.title,
        "og_description": article.og_description,
        "image": f"/{image_filename}",
        "keywords": article.keywords,
    })

    _save_article_registry(entries)
    record_event("ai_news_registry_updated", slug=article.slug)


def _js_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").replace("\r", "")


def _slug_to_var(slug: str) -> str:
    """Convert a slug to a valid JS variable name: some-article-slug → someArticleSlug."""
    parts = slug.split("-")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


# ---------------------------------------------------------------------------
# Step 7: Compose caption
# ---------------------------------------------------------------------------


async def compose_caption(article: Article, story: Story) -> str:
    prompt = f"""Write an Instagram caption for tastytechbytes.com promoting this article.

Title: {article.title}
Summary: {article.og_description}
Source: {story.source}

Constraints:
- 3 short paragraphs separated by blank lines
- At most 2 emoji total — use sparingly
- No hashtag walls inside the paragraphs
- End with: "Full read at tastytechbytes.com/{article.slug}"
- After that on a new line add exactly: "#tastytechbytes #AI #{_slug_to_hashtag(article.slug)} #MachineLearning #DevTools"
- Total length must be under 2100 chars"""

    caption = await generate_text(prompt, purpose="instagram_caption")
    caption = caption.strip()

    if len(caption) > 2200:
        caption = caption[:2197] + "..."

    return caption


def _slug_to_hashtag(slug: str) -> str:
    return "".join(word.capitalize() for word in slug.split("-")[:3])


# ---------------------------------------------------------------------------
# Step 8: Publish to Instagram
# ---------------------------------------------------------------------------


async def publish_to_instagram(article: Article, image_filename: str, caption: str) -> tuple[str, str]:
    port = env_value("APP_PORT", default="8102")
    base = f"http://127.0.0.1:{port}"

    payload = {
        "channel": "instagram",
        "campaign_name": f"AI News — {article.slug}",
        "text": caption,
        "local_image_path": image_filename,
        "alt_text": article.og_description[:1000],
        "link_url": f"https://tastytechbytes.com/{article.slug}",
        "dry_run": False,
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{base}/api/publish", json=payload)
        resp.raise_for_status()

    result = resp.json()
    return result.get("publish_log_id", ""), result.get("external_id", "")
