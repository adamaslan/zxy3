#!/usr/bin/env python3
"""
Bakehouse artist enrichment — Instagram handles and CV URLs.

Reads artists tagged "Bakehouse" from data/artists-consolidated.csv,
visits each artist's personal website, and extracts:
  - Instagram profile URL
  - CV / resume PDF URL

Results are written back into artists-consolidated.csv.

Usage:
    python scripts/enrich_bakehouse_artists.py
    python scripts/enrich_bakehouse_artists.py --dry-run
    python scripts/enrich_bakehouse_artists.py --limit 20
    python scripts/enrich_bakehouse_artists.py --resume
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse, urlunparse

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

GALLERY_NAME = "Bakehouse"
CSV_PATH = Path("data/artists-consolidated.csv")
CHECKPOINT_PATH = Path("data/.bakehouse_enrichment_checkpoint.json")
ENRICHMENT_REPORT_PATH = Path("data/bakehouse_enrichment_report.json")

TIMEOUT = 15
DELAY = 0.4

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Domains that are NOT useful artist websites (ad/CDN/tracking networks).
DOMAIN_BLACKLIST = frozenset({
    "doubleclick.net", "google-analytics.com", "cloudflare.com",
    "unpkg.com", "bit.ly", "tinyurl.com", "short.link",
    "facebook.com", "twitter.com", "youtube.com",
    "maps.google.com", "goo.gl",
})

# Trusted portfolio platforms — treat links here as high-quality.
PORTFOLIO_PLATFORMS = frozenset({
    "squarespace.com", "wix.com", "wordpress.com", "cargo.site",
    "cargocollective.com", "format.com", "dunked.com",
    "artsy.net", "artnet.com",
})

# Common CV subpaths to probe when no PDF link is found in the main page.
CV_PROBE_PATHS = ["/cv", "/cv.pdf", "/resume", "/resume.pdf", "/bio", "/about"]


# ---------------------------------------------------------------------------
# Checkpoint (resumable enrichment)
# ---------------------------------------------------------------------------

def load_checkpoint() -> set[str]:
    """Return names of artists already enriched in a previous run."""
    if not CHECKPOINT_PATH.exists():
        return set()
    with open(CHECKPOINT_PATH) as f:
        return set(json.load(f))


def save_checkpoint(done: set[str]) -> None:
    with open(CHECKPOINT_PATH, "w") as f:
        json.dump(sorted(done), f, indent=2)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def fetch(url: str) -> str:
    """Fetch URL via curl; return HTML or '' on failure."""
    if not url.startswith(("http://", "https://")):
        return ""
    cmd = ["curl", "-sL", "--max-time", str(TIMEOUT)]
    for key, value in HEADERS.items():
        cmd.extend(["-H", f"{key}: {value}"])
    cmd.append(url)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT + 5)
        return result.stdout if result.returncode == 0 else ""
    except Exception as e:
        logger.debug("fetch(%s) error: %s", url, e)
        return ""


def resolve_url(url: str) -> str:
    """Follow redirects to final destination; normalise trailing slashes."""
    cmd = ["curl", "-sIL", "--max-time", "8", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        for line in reversed(result.stdout.splitlines()):
            if line.lower().startswith("location:"):
                return line.split(":", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    return url.rstrip("/")


def normalize_url(url: str) -> str:
    """Enforce https, www, strip query/fragment."""
    parsed = urlparse(url)
    netloc = parsed.netloc
    if not netloc.startswith("www.") and "." in netloc:
        netloc = f"www.{netloc}"
    path = parsed.path.rstrip("/") or "/"
    return urlunparse(("https", netloc, path, "", "", ""))


def is_valid_artist_website(url: str) -> bool:
    """Filter out ad/CDN/tracking domains."""
    parsed = urlparse(url)
    domain = parsed.netloc.lstrip("www.")
    if any(bad in domain for bad in DOMAIN_BLACKLIST):
        return False
    # Accept portfolio platforms and custom domains.
    if any(platform in domain for platform in PORTFOLIO_PLATFORMS):
        return True
    return "." in domain and 5 < len(domain) < 60


# ---------------------------------------------------------------------------
# Instagram extraction
# ---------------------------------------------------------------------------

def extract_instagram(html: str) -> Optional[str]:
    """
    Return the first Instagram profile URL found in the page HTML.

    Tries full URLs first, then bare handles in common meta/link contexts.
    """
    # Full URLs
    for match in re.finditer(
        r'https?://(?:www\.)?instagram\.com/([a-zA-Z0-9_.]{1,30})/?',
        html,
        re.IGNORECASE,
    ):
        handle = match.group(1)
        # Ignore generic Instagram pages (explore, accounts, etc.)
        if handle.lower() not in {"explore", "accounts", "p", "reel", "stories"}:
            return f"https://www.instagram.com/{handle}"

    # Bare handle in meta/link tags
    for match in re.finditer(
        r'(?:instagram|ig)["\s:]+@?([a-zA-Z0-9_.]{3,30})',
        html,
        re.IGNORECASE,
    ):
        handle = match.group(1)
        return f"https://www.instagram.com/{handle}"

    return None


# ---------------------------------------------------------------------------
# CV extraction
# ---------------------------------------------------------------------------

def extract_cv_url(html: str, base_url: str) -> Optional[str]:
    """
    Return the first CV / resume PDF URL found in page HTML.

    Checks:
    1. Links whose href or link text references "cv", "resume", "curriculum".
    2. Common subpaths probed via HEAD request if nothing found in HTML.
    """
    # Pattern: href containing cv/resume path or ending in .pdf
    patterns = [
        r'href=["\']([^"\']*(?:cv|resume|curriculum)[^"\']*\.pdf)["\']',
        r'href=["\']([^"\']*\.pdf)["\']',
        r'href=["\']([^"\']*(?:/cv|/resume)[^"\']*)["\']',
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, html, re.IGNORECASE):
            href = match.group(1)
            if href.startswith("http"):
                return href
            if href.startswith("/"):
                return urljoin(base_url, href)

    # Probe common subpaths
    for path in CV_PROBE_PATHS:
        url = urljoin(base_url, path)
        cmd = ["curl", "-sI", "--max-time", "6", url]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
            status_line = result.stdout.splitlines()[0] if result.stdout else ""
            if "200" in status_line:
                return url
        except Exception:
            pass
        time.sleep(0.2)

    return None


# ---------------------------------------------------------------------------
# CSV I/O
# ---------------------------------------------------------------------------

CSV_FIELDNAMES = [
    "id", "name", "slug", "nationality", "birth_year",
    "website", "instagram", "instagram_followers",
    "galleries_exhibited", "cv_url",
]


def load_all_artists() -> dict[str, dict]:
    """Return all rows keyed by artist name."""
    if not CSV_PATH.exists():
        logger.error("%s not found — run extract_bakehouse_artists.py first", CSV_PATH)
        sys.exit(1)
    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return {row["name"].strip(): row for row in reader if row.get("name")}


def write_all_artists(artists: dict[str, dict]) -> None:
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(sorted(artists.values(), key=lambda r: r.get("name", "").lower()))


def bakehouse_artists_needing_enrichment(
    artists: dict[str, dict],
    done: set[str],
) -> list[dict]:
    """Return Bakehouse-tagged artists that still need Instagram or CV."""
    result = []
    for row in artists.values():
        if GALLERY_NAME not in row.get("galleries_exhibited", ""):
            continue
        if row["name"] in done:
            continue
        if not row.get("website", "").strip():
            continue  # nothing to scrape without a website
        missing_instagram = not row.get("instagram", "").strip()
        missing_cv = not row.get("cv_url", "").strip()
        if missing_instagram or missing_cv:
            result.append(row)
    return result


# ---------------------------------------------------------------------------
# Main enrichment loop
# ---------------------------------------------------------------------------

def enrich_artist(row: dict) -> dict:
    """Scrape Instagram and CV URL from an artist's website. Returns updated row."""
    name = row["name"]
    website = row.get("website", "").strip()

    if not is_valid_artist_website(website):
        logger.info("  SKIP invalid website: %s", website)
        return row

    logger.info("  Fetching %s …", website)
    html = fetch(website)

    if not html or len(html) < 200:
        logger.info("  No content returned")
        return row

    # Instagram
    if not row.get("instagram", "").strip():
        insta = extract_instagram(html)
        if insta:
            row["instagram"] = insta
            logger.info("  Instagram → %s", insta)
        else:
            logger.info("  Instagram → not found")

    # CV
    if not row.get("cv_url", "").strip():
        cv = extract_cv_url(html, website)
        if cv:
            row["cv_url"] = cv
            logger.info("  CV → %s", cv)
        else:
            logger.info("  CV → not found")

    time.sleep(DELAY)
    return row


def run(dry_run: bool = False, limit: Optional[int] = None, resume: bool = False) -> None:
    all_artists = load_all_artists()
    done = load_checkpoint() if resume else set()

    targets = bakehouse_artists_needing_enrichment(all_artists, done)
    if limit:
        targets = targets[:limit]

    total = len(targets)
    logger.info(
        "Enriching %d Bakehouse artists%s …",
        total,
        f" (resume: {len(done)} already done)" if resume else "",
    )

    stats = {"instagram_found": 0, "cv_found": 0, "skipped_no_website": 0}
    report: list[dict] = []

    for i, row in enumerate(targets, 1):
        name = row["name"]
        website = row.get("website", "").strip()
        print(f"\n[{i}/{total}] {name}")

        if not website:
            logger.info("  No website — skipping")
            stats["skipped_no_website"] += 1
            done.add(name)
            continue

        before_insta = row.get("instagram", "")
        before_cv = row.get("cv_url", "")

        updated = enrich_artist(row)

        found_insta = bool(updated.get("instagram") and not before_insta)
        found_cv = bool(updated.get("cv_url") and not before_cv)

        if found_insta:
            stats["instagram_found"] += 1
        if found_cv:
            stats["cv_found"] += 1

        report.append({
            "name": name,
            "website": website,
            "instagram": updated.get("instagram", ""),
            "cv_url": updated.get("cv_url", ""),
        })

        all_artists[name] = updated
        done.add(name)

        # Checkpoint every 10 artists
        if i % 10 == 0:
            save_checkpoint(done)
            if not dry_run:
                write_all_artists(all_artists)
            logger.info("  Checkpoint saved (%d/%d)", i, total)

    # Final write
    save_checkpoint(done)
    if not dry_run:
        write_all_artists(all_artists)

    # Save enrichment report
    with open(ENRICHMENT_REPORT_PATH, "w") as f:
        json.dump(
            {
                "gallery": GALLERY_NAME,
                "artists_processed": total,
                "stats": stats,
                "results": report,
            },
            f,
            indent=2,
        )

    print(f"\n{'=' * 60}")
    print(f"ENRICHMENT COMPLETE — {GALLERY_NAME}")
    print(f"{'=' * 60}")
    print(f"  Artists processed:   {total}")
    print(f"  Instagram found:     {stats['instagram_found']}")
    print(f"  CV URLs found:       {stats['cv_found']}")
    print(f"  Skipped (no site):   {stats['skipped_no_website']}")
    if dry_run:
        print(f"\n[DRY RUN] No changes written to {CSV_PATH}")
    else:
        print(f"\nUpdated {CSV_PATH}")
    print(f"Report saved to {ENRICHMENT_REPORT_PATH}")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Enrich Bakehouse artists with Instagram handles and CV URLs"
    )
    parser.add_argument("--dry-run", action="store_true", help="Run without writing changes")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N artists")
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip artists already processed in a previous run",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, limit=args.limit, resume=args.resume)


if __name__ == "__main__":
    main()
