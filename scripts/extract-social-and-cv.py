#!/usr/bin/env python3
"""
Extract Instagram handles and CV links from artist websites.
Uses curl + regex parsing per terminal-scraping-guide.md
"""

import subprocess
import csv
import re
import sys
import time
import json
from pathlib import Path
from urllib.parse import urljoin, urlparse

CSV_PATH = Path(__file__).parent.parent / "data" / "artists-consolidated.csv"
OUTPUT_JSON = Path(__file__).parent.parent / "data" / "artist-enrichment.json"
TIMEOUT = 15
DELAY = 0.3  # Respectful delay between requests

# Browser headers to avoid blocks
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_url(url: str) -> str:
    """Fetch URL using curl with proper headers."""
    if not url.startswith(("http://", "https://")):
        return ""

    try:
        cmd = ["curl", "-sL", "--max-time", str(TIMEOUT)]
        for key, value in HEADERS.items():
            cmd.extend(["-H", f"{key}: {value}"])
        cmd.append(url)

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT)
        return result.stdout if result.returncode == 0 else ""
    except Exception as e:
        print(f"  Error fetching {url}: {e}", file=sys.stderr)
        return ""


def extract_instagram_urls(html: str, base_url: str) -> list:
    """Extract Instagram URLs from HTML."""
    instagram_urls = []

    # Find all Instagram links (exact patterns)
    patterns = [
        r'https?://(?:www\.)?instagram\.com/[a-zA-Z0-9_.]+/?',  # Direct links
        r'instagram\.com/[a-zA-Z0-9_.]+',  # Without protocol
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, html, re.IGNORECASE):
            url = match.group(0)
            if not url.startswith("http"):
                url = "https://" + url
            if url not in instagram_urls:
                instagram_urls.append(url.rstrip("/"))

    return instagram_urls


def extract_cv_urls(html: str, base_url: str) -> list:
    """Extract CV/Resume document links from HTML."""
    cv_urls = []

    # Common CV patterns
    patterns = [
        r'href=["\']([^"\']*(?:cv|resume|curriculum|c\.v\.)[^"\']*\.pdf)["\']',
        r'href=["\']([^"\']*(?:cv|resume)[^"\']*)["\']',
        r'(?:Download|View)\s+(?:CV|Resume|Curriculum)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, html, re.IGNORECASE):
            if len(match.groups()) > 0:
                url = match.group(1)
                if url:
                    # Make absolute URL
                    if url.startswith("/"):
                        url = urljoin(base_url, url)
                    elif not url.startswith("http"):
                        url = urljoin(base_url, url)

                    if url not in cv_urls and url.endswith(".pdf"):
                        cv_urls.append(url)

    return cv_urls


def scrape_artist_data(name: str, website: str) -> dict:
    """Scrape Instagram and CV from artist website."""
    result = {
        "name": name,
        "website": website,
        "instagram": None,
        "cv_pdf": None,
    }

    print(f"\n🔍 {name}")
    print(f"   Website: {website}")

    # Fetch main website
    print(f"   Fetching website...", end="", flush=True)
    html = fetch_url(website)
    if not html:
        print(" ✗ (no content)")
        return result
    print(" ✓")

    # Extract Instagram
    print(f"   Searching for Instagram...", end="", flush=True)
    insta_urls = extract_instagram_urls(html, website)
    if insta_urls:
        result["instagram"] = insta_urls[0]
        print(f" ✓ {insta_urls[0]}")
    else:
        print(" ✗")

    # Extract CV
    print(f"   Searching for CV/Resume PDF...", end="", flush=True)
    cv_urls = extract_cv_urls(html, website)
    if cv_urls:
        result["cv_pdf"] = cv_urls[0]
        print(f" ✓ {cv_urls[0]}")
    else:
        print(" ✗")

    # Try common CV paths if not found
    if not result["cv_pdf"]:
        print(f"   Trying common CV paths...", end="", flush=True)
        cv_paths = ["/cv", "/cv.pdf", "/resume", "/resume.pdf", "/bio", "/about"]
        for path in cv_paths:
            cv_url = urljoin(website, path)
            cv_html = fetch_url(cv_url)
            if cv_html:
                result["cv_pdf"] = cv_url
                print(f" ✓ {cv_url}")
                break
        if not result["cv_pdf"]:
            print(" ✗")

    time.sleep(DELAY)
    return result


def load_artists_with_websites() -> list:
    """Load artists that have websites but may be missing Instagram/CV."""
    artists = []
    with open(CSV_PATH, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('name', '').strip()
            website = row.get('website', '').strip()
            instagram = row.get('instagram', '').strip()

            if name and website:
                artists.append({
                    "name": name,
                    "website": website,
                    "instagram_existing": instagram,
                })

    return artists


def main():
    """Main extraction process."""
    artists = load_artists_with_websites()
    print(f"\n📊 Found {len(artists)} artists with websites\n")

    enrichment_data = {}
    found_count = {"instagram": 0, "cv": 0}

    # Process artists
    for i, artist in enumerate(artists, 1):  # Process all artists
        print(f"[{i}/{len(artists)}]", end="")

        data = scrape_artist_data(artist["name"], artist["website"])
        enrichment_data[artist["name"]] = data

        if data["instagram"]:
            found_count["instagram"] += 1
        if data["cv_pdf"]:
            found_count["cv"] += 1

    # Save results
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(enrichment_data, f, indent=2)

    print(f"\n\n✅ Results saved to {OUTPUT_JSON}")
    print(f"Found Instagram: {found_count['instagram']}")
    print(f"Found CV PDFs: {found_count['cv']}")


if __name__ == "__main__":
    main()
