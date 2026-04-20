#!/usr/bin/env python3
"""
Extract artist websites using terminal tools (curl + parsing).
Follows the terminal-scraping-guide.md approach.
"""

import subprocess
import csv
import json
import re
import sys
import time
from urllib.parse import urljoin, urlparse
from pathlib import Path

# Configuration
CSV_PATH = Path(__file__).parent.parent / "data" / "artists-consolidated.csv"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "artist-websites-extracted.json"
TIMEOUT = 10  # seconds per request
DELAY = 0.5   # delay between requests to be respectful

# Browser headers to avoid 403 errors
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_url(url: str) -> str:
    """Fetch URL using curl with proper headers."""
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


def try_google_search(artist_name: str) -> str:
    """Try to find artist website via Google (simplified terminal approach)."""
    # This would require parsing Google results, which is complex via terminal.
    # Instead, we'll try common patterns directly.
    return None


def try_common_patterns(artist_name: str) -> list:
    """Try common domain patterns for the artist."""
    patterns = [
        f"https://{artist_name.lower().replace(' ', '')}.com",
        f"https://{artist_name.lower().replace(' ', '-')}.com",
        f"https://www.{artist_name.lower().replace(' ', '')}.com",
        f"https://www.{artist_name.lower().replace(' ', '-')}.com",
        f"https://{artist_name.lower().split()[0]}.com",
    ]

    candidates = []
    for url in patterns:
        print(f"  Checking {url}...", file=sys.stderr)
        html = fetch_url(url)
        if html and len(html) > 500:  # Not a 404 or error page
            candidates.append(url)
            print(f"    ✓ Found content", file=sys.stderr)
        time.sleep(DELAY)

    return candidates


def extract_portfolio_sites(artist_name: str) -> list:
    """Extract links from known portfolio aggregators."""
    # For artists on Artsy, they have profiles
    artsy_url = f"https://www.artsy.net/artist/{artist_name.lower().replace(' ', '-')}"
    print(f"  Checking Artsy: {artsy_url}...", file=sys.stderr)

    html = fetch_url(artsy_url)
    if not html:
        print(f"    (no Artsy profile)", file=sys.stderr)
        return []

    candidates = []

    # Look for website links in Artsy profile (simplified parsing)
    # Pattern: "website" field in JSON-LD or href patterns
    for match in re.finditer(r'href="(https?://[^"]+)"', html):
        url = match.group(1)
        if "artsy.net" not in url and "instagram.com" not in url:
            candidates.append(url)

    time.sleep(DELAY)
    return candidates


def test_url(url: str) -> bool:
    """Test if URL is valid and returns content."""
    if not url.startswith(("http://", "https://")):
        return False

    html = fetch_url(url)
    return bool(html and len(html) > 200)


def find_artist_website(artist_name: str) -> dict:
    """Find artist website using multiple strategies."""
    result = {
        "artist": artist_name,
        "website": None,
        "source": None,
        "status": "not_found"
    }

    print(f"\n🔍 Searching for: {artist_name}")

    # Strategy 1: Try common domain patterns
    print(f"  Strategy 1: Common patterns...", file=sys.stderr)
    common = try_common_patterns(artist_name)
    if common:
        result["website"] = common[0]
        result["source"] = "common_pattern"
        result["status"] = "found"
        return result

    # Strategy 2: Look up on Artsy
    print(f"  Strategy 2: Artsy profile...", file=sys.stderr)
    artsy_sites = extract_portfolio_sites(artist_name)
    if artsy_sites:
        for site in artsy_sites:
            if test_url(site):
                result["website"] = site
                result["source"] = "artsy"
                result["status"] = "found"
                return result

    return result


def load_artists_needing_websites() -> list:
    """Load artists from CSV that are missing websites."""
    artists = []
    with open(CSV_PATH, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('name', '').strip()
            website = row.get('website', '').strip()

            if name and not website:
                artists.append(name)

    return artists


def main():
    """Main extraction process."""
    artists = load_artists_needing_websites()
    print(f"Found {len(artists)} artists missing websites\n")

    # Allow limiting artists via command line (e.g., --limit 10)
    limit = None
    if len(sys.argv) > 1 and sys.argv[1].startswith("--limit"):
        try:
            limit = int(sys.argv[1].split("=")[1])
        except (ValueError, IndexError):
            print("Usage: python extract-artist-websites.py [--limit=N]", file=sys.stderr)
            sys.exit(1)

    artists_to_process = artists[:limit] if limit else artists
    results = []
    for i, artist in enumerate(artists_to_process, 1):
        print(f"[{i}/{len(artists_to_process)}] {artist}")
        result = find_artist_website(artist)
        results.append(result)

        if result["status"] == "found":
            print(f"  ✓ Found: {result['website']}")
        else:
            print(f"  ✗ No website found")

    # Save results
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Results saved to {OUTPUT_PATH}")
    print(f"Found websites for: {sum(1 for r in results if r['status'] == 'found')}/{len(results)}")


if __name__ == "__main__":
    main()
