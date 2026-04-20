#!/usr/bin/env python3
"""
Bakehouse Art Complex — artist extraction script.

Fetches the artist/resident roster from bacfl.org and merges new entries
into data/artists-consolidated.csv.

Usage:
    python scripts/extract_bakehouse_artists.py
    python scripts/extract_bakehouse_artists.py --dry-run
    python scripts/extract_bakehouse_artists.py --output data/bakehouse_artists_preview.csv
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
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

GALLERY_NAME = "Bakehouse"
GALLERY_URL = "https://www.bacfl.org"
CSV_PATH = Path("data/artists-consolidated.csv")
REPORT_PATH = Path(f"data/extraction_report_bakehouse_{datetime.now().strftime('%Y%m%d')}.json")

# Probe these paths in order; use the first one that returns content.
CONTENT_PATHS = ["/artists", "/residents", "/studios", "/programs/studios", "/"]

TIMEOUT = 12
DELAY = 0.5

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Names that look like people but are NOT artists (parsing artifacts).
PARSING_ARTIFACTS = frozenset({
    "works by", "an exhibition", "curated by", "presented by",
    "courtesy of", "installation view", "press release",
    "opening reception", "gallery hours", "artist in residence",
    "studio program", "apply now", "learn more", "read more",
    "bakehouse art", "miami fl", "contact us",
})

VALID_NAME_RE = re.compile(
    r"^[A-Za-zÀ-ÿĀ-žА-яÆæØøÅå\s\-'&.,()0-9]+$"
)

# Known artist collectives / duos — keep as single entry.
KNOWN_COLLECTIVES: frozenset[str] = frozenset()


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class ValidationReport:
    """Accumulates validation findings during a single extraction run."""
    valid: list[dict] = field(default_factory=list)
    invalid: list[dict] = field(default_factory=list)
    duplicates: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def pass_rate(self) -> float:
        total = len(self.valid) + len(self.invalid)
        return len(self.valid) / total if total else 0.0

    def summary(self) -> str:
        return (
            f"\nExtraction Report — {GALLERY_NAME} ({datetime.now().date()})\n"
            f"{'=' * 60}\n"
            f"Valid artists:        {len(self.valid)}\n"
            f"Invalid (skipped):    {len(self.invalid)}\n"
            f"Potential duplicates: {len(self.duplicates)}\n"
            f"Warnings:             {len(self.warnings)}\n"
            f"Pass rate:            {self.pass_rate:.1%}\n"
            f"{'=' * 60}\n"
        )

    def save(self, path: Path) -> None:
        with open(path, "w") as f:
            json.dump(
                {
                    "gallery": GALLERY_NAME,
                    "date": datetime.now().isoformat(),
                    "valid": self.valid,
                    "invalid": self.invalid,
                    "duplicates": self.duplicates,
                    "warnings": self.warnings,
                    "pass_rate": self.pass_rate,
                },
                f,
                indent=2,
            )


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def fetch(url: str) -> str:
    """Fetch a URL via curl; return HTML string or '' on failure."""
    cmd = ["curl", "-sL", "--max-time", str(TIMEOUT)]
    for key, value in HEADERS.items():
        cmd.extend(["-H", f"{key}: {value}"])
    cmd.append(url)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT + 5)
        return result.stdout if result.returncode == 0 else ""
    except Exception as e:
        logger.warning("fetch(%s) failed: %s", url, e)
        return ""


def head_ok(url: str) -> bool:
    """Return True if a HEAD request succeeds (status 200)."""
    cmd = ["curl", "-sI", "--max-time", "6", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        return "200" in result.stdout.split("\n")[0]
    except Exception:
        return False


def discover_content_url(base: str, paths: list[str]) -> str:
    """Return the first path under base that responds with HTTP 200."""
    for path in paths:
        url = base.rstrip("/") + path
        logger.info("Probing %s …", url)
        if head_ok(url):
            logger.info("  → Found content at %s", url)
            return url
        time.sleep(0.3)
    logger.warning("No dedicated content page found; falling back to %s", base)
    return base


# ---------------------------------------------------------------------------
# Name extraction
# ---------------------------------------------------------------------------

def strip_html_tags(html: str) -> str:
    """Remove HTML tags, collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&[a-zA-Z]+;", " ", text)  # HTML entities
    return re.sub(r"\s+", " ", text).strip()


def extract_json_ld_names(html: str) -> list[str]:
    """Pull person names from JSON-LD structured data if present."""
    names: list[str] = []
    for blob in re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.DOTALL | re.IGNORECASE,
    ):
        try:
            data = json.loads(blob)
            # Handle @graph arrays or single objects
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict):
                    for key in ("name", "author", "contributor", "performer"):
                        val = item.get(key)
                        if isinstance(val, str):
                            names.append(val)
                        elif isinstance(val, list):
                            names.extend(
                                v["name"] for v in val if isinstance(v, dict) and "name" in v
                            )
        except (json.JSONDecodeError, TypeError):
            pass
    return names


def extract_linked_names(html: str) -> list[str]:
    """Extract names from anchor tags that look like artist profile links."""
    names: list[str] = []
    for match in re.finditer(
        r'<a[^>]+href=["\'][^"\']*(?:artist|resident|studio|profile)[^"\']*["\'][^>]*>\s*([^<]{3,60})\s*</a>',
        html,
        re.IGNORECASE,
    ):
        names.append(match.group(1).strip())
    return names


def extract_names_from_text(text: str) -> list[str]:
    """
    Heuristic extraction of person names from plain text.

    Looks for sequences of 2-4 capitalized words, handling common
    particles (van, de, von…) and hyphenated names.
    """
    name_pattern = re.compile(
        r"\b"
        r"(?:[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜĀĒĪŌŪ][a-záéíóúàèìòùäëïöüāēīōū'-]+)"   # First
        r"(?:\s+(?:de|van|von|di|del|le|la|el|al|d'|bin|dos|das)\s+)?"   # particle
        r"(?:\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜĀĒĪŌŪ][a-záéíóúàèìòùäëïöüāēīōū'-]+)+"  # Last(s)
        r"\b"
    )
    return name_pattern.findall(text)


def parse_artist_names(html: str) -> list[str]:
    """
    Multi-strategy name extraction from a gallery page.

    Priority:
    1. JSON-LD structured data (highest quality)
    2. Linked artist names (<a href="…/artist/…">Name</a>)
    3. Heuristic name pattern from plain text (fallback)

    Returns deduplicated list preserving discovery order.
    """
    # Strategy 1 — structured data
    names = extract_json_ld_names(html)
    if names:
        logger.info("  JSON-LD: %d names found", len(names))

    # Strategy 2 — linked names
    linked = extract_linked_names(html)
    if linked:
        logger.info("  Linked hrefs: %d names found", len(linked))
        names.extend(linked)

    # Strategy 3 — plain text heuristics (always run as supplement)
    text = strip_html_tags(html)
    heuristic = extract_names_from_text(text)
    logger.info("  Heuristic: %d candidates from plain text", len(heuristic))
    names.extend(heuristic)

    # Deduplicate (case-insensitive, preserve first-seen casing)
    seen: dict[str, str] = {}
    for name in names:
        key = name.lower().strip()
        if key and key not in seen:
            seen[key] = name.strip()

    return list(seen.values())


# ---------------------------------------------------------------------------
# Validation & normalisation
# ---------------------------------------------------------------------------

def normalize_for_matching(name: str) -> str:
    """Strip accents and normalise whitespace for fuzzy comparison."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_name = nfkd.encode("ascii", "ignore").decode("ascii")
    return " ".join(word.capitalize() for word in ascii_name.split())


def validate_artist_name(name: str) -> tuple[bool, Optional[str]]:
    """Return (is_valid, reason_if_invalid)."""
    name = name.strip()

    if not name:
        return False, "Empty name"
    if len(name) < 3:
        return False, f"Too short: '{name}'"
    if len(name) > 80:
        return False, f"Too long ({len(name)} chars): '{name}'"
    if not VALID_NAME_RE.match(name):
        return False, f"Invalid characters: '{name}'"
    if name.startswith(",") or name.endswith(","):
        return False, f"Leading/trailing comma: '{name}'"

    name_lower = name.lower()
    for artifact in PARSING_ARTIFACTS:
        if artifact in name_lower:
            return False, f"Parsing artifact: '{name}'"

    if " " not in name and len(name) < 6 and name not in KNOWN_COLLECTIVES:
        return False, f"Single short word (likely incomplete): '{name}'"

    return True, None


def find_existing_match(
    name: str,
    existing_names: list[str],
    threshold: float = 0.85,
) -> Optional[tuple[str, float]]:
    """
    Return the best fuzzy match from existing_names, or None.

    Tries exact → normalised exact → SequenceMatcher → token-sort.
    """
    norm_new = normalize_for_matching(name)

    for existing in existing_names:
        if name.lower() == existing.lower():
            return existing, 1.0
        norm_ex = normalize_for_matching(existing)
        if norm_new == norm_ex:
            return existing, 0.99

    best: Optional[tuple[str, float]] = None
    for existing in existing_names:
        norm_ex = normalize_for_matching(existing)
        ratio = SequenceMatcher(None, norm_new.lower(), norm_ex.lower()).ratio()
        tokens_new = sorted(norm_new.lower().split())
        tokens_ex = sorted(norm_ex.lower().split())
        token_ratio = SequenceMatcher(None, " ".join(tokens_new), " ".join(tokens_ex)).ratio()
        score = max(ratio, token_ratio)
        if score >= threshold and (best is None or score > best[1]):
            best = (existing, score)

    return best


def run_quality_checks(artists: list[str]) -> list[str]:
    """Return list of warning strings for suspicious entries."""
    warnings: list[str] = []
    seen: set[str] = set()

    for name in artists:
        if " " not in name:
            warnings.append(f"Single-word name (parse error?): '{name}'")
        if len(name) > 50:
            warnings.append(f"Suspiciously long name: '{name}'")
        if name == name.upper() or (name == name.lower() and name not in KNOWN_COLLECTIVES):
            warnings.append(f"Bad capitalisation: '{name}'")
        lower = name.lower()
        if lower in seen:
            warnings.append(f"Duplicate entry: '{name}'")
        seen.add(lower)

    if len(artists) < 5:
        warnings.append(
            f"Very few artists extracted ({len(artists)}) — verify extraction logic"
        )
    return warnings


# ---------------------------------------------------------------------------
# CSV I/O
# ---------------------------------------------------------------------------

CSV_FIELDNAMES = [
    "id", "name", "slug", "nationality", "birth_year",
    "website", "instagram", "instagram_followers",
    "galleries_exhibited", "cv_url",
]


def load_existing_artists() -> dict[str, dict]:
    """Return dict keyed by artist name (original casing)."""
    if not CSV_PATH.exists():
        return {}
    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return {row["name"].strip(): row for row in reader if row.get("name")}


def write_consolidated_csv(artists: dict[str, dict]) -> None:
    """Write merged artists back to CSV_PATH."""
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(sorted(artists.values(), key=lambda r: r.get("name", "").lower()))


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run(dry_run: bool = False, output: Optional[Path] = None) -> None:
    report = ValidationReport()

    # 1. Discover content page
    logger.info("[1/5] Probing Bakehouse website for artist roster page …")
    content_url = discover_content_url(GALLERY_URL, CONTENT_PATHS)
    time.sleep(DELAY)

    # 2. Fetch HTML
    logger.info("[2/5] Fetching %s …", content_url)
    html = fetch(content_url)
    if not html or len(html) < 200:
        logger.error("No usable HTML returned from %s — aborting.", content_url)
        sys.exit(1)

    # 3. Extract names
    logger.info("[3/5] Extracting artist names …")
    raw_names = parse_artist_names(html)
    logger.info("  Raw candidates: %d", len(raw_names))

    # Quality checks before validation
    qc_warnings = run_quality_checks(raw_names)
    for w in qc_warnings:
        logger.warning("QC: %s", w)
        report.warnings.append(w)

    # 4. Validate names
    logger.info("[4/5] Validating names …")
    valid_names: list[str] = []
    for name in raw_names:
        ok, reason = validate_artist_name(name)
        if ok:
            valid_names.append(name)
            report.valid.append({"name": name})
        else:
            report.invalid.append({"name": name, "reason": reason})
            logger.debug("SKIP %r — %s", name, reason)

    logger.info("  Valid: %d / %d", len(valid_names), len(raw_names))

    # 5. Merge into existing CSV
    logger.info("[5/5] Merging into %s …", CSV_PATH)
    existing = load_existing_artists()
    existing_names = list(existing.keys())

    new_count = 0
    updated_count = 0

    for name in valid_names:
        match = find_existing_match(name, existing_names)
        if match:
            existing_name, score = match
            if score == 1.0:
                # Exact match — just tag the gallery
                row = existing[existing_name]
                galleries = row.get("galleries_exhibited", "")
                if GALLERY_NAME not in galleries:
                    row["galleries_exhibited"] = (
                        f"{galleries}, {GALLERY_NAME}" if galleries else GALLERY_NAME
                    )
                    updated_count += 1
            else:
                report.duplicates.append(
                    {"new": name, "existing": existing_name, "similarity": round(score, 3)}
                )
                logger.info("  NEAR-DUP (%d%%): '%s' ~ '%s'", int(score * 100), name, existing_name)
        else:
            # New artist
            existing[name] = {
                "id": "",
                "name": name,
                "slug": "",
                "nationality": "",
                "birth_year": "",
                "website": "",
                "instagram": "",
                "instagram_followers": "",
                "galleries_exhibited": GALLERY_NAME,
                "cv_url": "",
            }
            existing_names.append(name)
            new_count += 1

    print(report.summary())
    print(f"  New artists:     {new_count}")
    print(f"  Gallery tags added: {updated_count}")
    print(f"  Near-duplicates (manual review): {len(report.duplicates)}")

    dest = output or CSV_PATH
    if dry_run:
        print(f"\n[DRY RUN] Would write {len(existing)} total artists to {dest}")
        sample = [r["name"] for r in existing.values() if r.get("galleries_exhibited") == GALLERY_NAME][:20]
        for n in sample:
            print(f"  + {n}")
        if new_count > 20:
            print(f"  … and {new_count - 20} more")
    else:
        if output:
            # Write only Bakehouse artists to the preview file
            with open(output, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
                writer.writeheader()
                for row in existing.values():
                    if GALLERY_NAME in row.get("galleries_exhibited", ""):
                        writer.writerow(row)
            print(f"\nBakehouse artists written to {output}")
        else:
            write_consolidated_csv(existing)
            print(f"\nUpdated {CSV_PATH} ({len(existing)} total artists)")

    report.save(REPORT_PATH)
    print(f"Validation report saved to {REPORT_PATH}")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract Bakehouse Art Complex artists and merge into artists-consolidated.csv"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview extraction without writing to CSV",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Write only Bakehouse artists to this path instead of updating the consolidated CSV",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, output=args.output)


if __name__ == "__main__":
    main()
