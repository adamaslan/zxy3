# Generic Gallery & Artist Extraction Guide

**Version**: 2.0  
**Last Updated**: April 16, 2026  
**Purpose**: Reusable methodology for extracting artist data from any gallery website and enriching `galleries-consolidated.csv`  
**Scope**: Artist extraction, gallery metadata enrichment, and ongoing CSV maintenance

---

## Overview

This guide provides a systematic, reusable approach to:
1. **Extract artist information** from gallery websites
2. **Enrich gallery metadata** (locations, websites, types) in `galleries-consolidated.csv`
3. **Maintain data quality** over time as galleries open, close, or change

**Key Principles**:
- **No hardcoding**: Logic is data-driven and parameterizable
- **Resumable**: Process supports checkpoints and recovery
- **Validated**: Every extracted record is validated before insertion
- **Auditable**: Full source tracking for every artist and gallery
- **Portable**: Methodology applies to any gallery website
- **Idempotent**: Running the same extraction twice produces the same result
- **Defensive**: Assumes data is dirty until proven clean

---

## Phase 1: Gallery Structure Analysis

Before any extraction begins, analyze the target gallery's website structure.

### 1.1 Identify Exhibition Listing Format

Determine how the gallery displays exhibitions. Common patterns:

| Pattern | Example | Detection Method |
|---------|---------|------------------|
| **Chronological list** | Gallery displays shows in reverse chronological order | View page source; check for `<article>`, `<section>`, `<div class="exhibition">` patterns |
| **Pagination** | Shows split across pages (e.g., "Page 1 of 10") | Check for `?page=` query parameters or pagination UI |
| **Infinite scroll** | More shows load as user scrolls down | Check for `IntersectionObserver` or AJAX load patterns in JS |
| **Dynamic/filtered** | User selects year/artist/medium to filter | Check for JavaScript event listeners; use browser DevTools Network tab |
| **Archive vs. Current** | Separate sections for current + historical shows | Check page structure; may need to visit `/exhibitions/archive` or `/past` |
| **SPA/React-rendered** | Content rendered client-side with no server HTML | View source vs. inspect element — if source is empty `<div id="root">`, need headless browser |
| **WordPress/CMS-based** | Structured posts with categories and tags | Check `/wp-json/wp/v2/` API endpoint; parse REST API directly |

**Tools**:
- Browser DevTools (F12) → Network tab to observe API calls
- `curl -s <url> | head -100` to check if content is server-rendered
- Wappalyzer or BuiltWith to identify CMS/framework

### 1.2 Map Exhibition Metadata

For each exhibition, extract:

```
Exhibition Structure:
├── Title (required)
├── Date Range: Start → End (required)
├── Location (required for multi-location galleries)
├── Artist List (required — primary or full participant list)
├── Exhibition Type (solo / group / curated / open / art_fair)
├── Description / Tagline (optional)
├── Exhibition URL (optional — for linking back)
├── Curated By (optional — if named curator)
└── Press Release URL (optional — for deeper artist context)
```

### 1.3 Identify Artist Name Extraction Patterns

Gallery websites typically display artist names in standardized formats:

```
Pattern Examples:

1. Comma-separated list:
   "works by Michael Angelo Bala, Ellen Berkenblit, Nicholas Campbell, [...]"

2. Oxford comma with "and":
   "An exhibition of works by A, B, C, and D"

3. Line-separated (one per line):
   Artist 1
   Artist 2
   Artist 3

4. Structured data (JSON-LD):
   {
     "@type": "Exhibition",
     "contributor": [
       {"name": "Artist Name"},
       ...
     ]
   }

5. HTML list elements:
   <ul class="artists"><li>Artist 1</li><li>Artist 2</li></ul>

6. Linked artist names:
   <a href="/artists/artist-slug">Artist Name</a>

7. Table format:
   | Artist Name | Medium | Price |

8. Press-release style (paragraph with embedded names):
   "The exhibition features new paintings by Jean-François Lauda alongside
   sculptures from Olivia van Kuiken and video works by Coco Young."
```

**Detection**: View page source (Ctrl+U); search for opening line of artist list. Use regex to identify pattern. Check for JSON-LD (`<script type="application/ld+json">`) first — it's the cleanest source.

### 1.4 Pre-Extraction Reconnaissance Checklist

Before writing any code:

- [ ] Can you get all exhibitions from a single page, or are there multiple pages/API calls?
- [ ] Are artist names in the HTML source, or loaded dynamically via JavaScript?
- [ ] Does the gallery have a dedicated `/artists` page that lists all represented artists?
- [ ] Are there JSON-LD or microdata structured annotations?
- [ ] Does the gallery expose an API (check Network tab during page load)?
- [ ] How does the gallery handle multi-location shows (same show, different city)?
- [ ] Are collaborative duos listed as one entry or two (e.g., "Daniel Dewar & Grégory Gicquel")?

---

## Phase 2: Data Extraction Strategy

### 2.1 Choose Extraction Method

| Method | Best For | Trade-offs | When to Use |
|--------|----------|-----------|-------------|
| **JSON-LD / Microdata** | Galleries with structured data | Best quality data; may not exist | Always check first |
| **REST API** | WordPress/CMS sites, SPAs | Cleanest extraction; bypasses HTML parsing entirely | Check `/wp-json/`, Network tab |
| **HTML parsing (BeautifulSoup)** | Structured HTML with class names | Requires knowledge of HTML structure; breaks on redesigns | Static server-rendered pages |
| **Regex parsing** | Known, consistent text formats | Fragile if HTML changes; needs careful pattern tuning | Supplement to HTML parsing |
| **Headless browser (Playwright)** | Dynamic content, infinite scroll, JS rendering | Slower; overkill for static content | Only when HTML is empty |
| **Hybrid (HTML + Regex + API)** | Mixed formats | Most robust; handles variations | Default recommendation |

**Decision tree**:
```
1. Does the page have JSON-LD or REST API? → Use that
2. Is content in the HTML source (curl)? → BeautifulSoup + regex
3. Is HTML source empty/minimal? → Playwright headless browser
4. Mixed content sources? → Hybrid approach
```

### 2.2 Build Reusable Extraction Functions

Create parameterized functions that don't hardcode gallery-specific logic:

```python
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass(frozen=True)
class Exhibition:
    """Immutable exhibition record."""
    title: str
    start_date: Optional[date]
    end_date: Optional[date]
    location: str
    artists: tuple[str, ...]
    exhibition_type: str  # solo, group, curated, open
    url: Optional[str] = None
    gallery_name: Optional[str] = None


@dataclass(frozen=True)
class GalleryConfig:
    """Configuration for extracting data from a specific gallery."""
    gallery_name: str
    base_url: str
    exhibition_selector: str
    artist_list_selector: str
    artist_pattern: str
    date_pattern: Optional[str] = None
    pagination: Optional[dict] = None
    locations: tuple[str, ...] = field(default_factory=tuple)
    artists_page_url: Optional[str] = None  # Direct /artists page if available


def extract_exhibitions(config: GalleryConfig) -> list[Exhibition]:
    """
    Generic exhibition extraction function.

    Args:
        config: Gallery-specific extraction configuration.

    Returns:
        List of Exhibition objects with extracted metadata.

    Raises:
        ExtractionError: If the page structure doesn't match expected selectors.
    """
    ...


def parse_artist_names(
    artist_text: str,
    pattern: str = r"[A-Z][a-zà-ÿ]+(?:\s(?:de|von|van|d'|el|al|bin|del|di|le|la)\s)?(?:[A-Z][a-zà-ÿ]+\.?\s?)*[A-Z][a-zà-ÿ]+",
    normalize: bool = True,
) -> list[str]:
    """
    Parse comma or "and"-separated artist names from text.

    Handles:
    - Standard names: "Ellen Berkenblit"
    - Accented names: "Jean-François Lauda", "Sof'ya Shpurova"
    - Particles: "Olivia van Kuiken", "Justin de Verteuil"
    - Hyphenated: "Jean-Marie Appriou"
    - Initials: "Michael A. Smith"
    - East Asian name order: "Leah Ke Yi Zheng"

    Args:
        artist_text: Raw text containing artist names.
        pattern: Regex pattern for single artist name.
        normalize: If True, normalize whitespace and trim.

    Returns:
        List of parsed, deduplicated artist names.
    """
    ...


def fuzzy_match_artist(
    name: str,
    existing_artists: list[str],
    threshold: float = 0.85,
) -> Optional[str]:
    """
    Fuzzy match new artist name against existing dataset.

    Uses multiple strategies:
    1. Exact match (case-insensitive)
    2. Normalized match (strip accents, lowercase)
    3. SequenceMatcher ratio
    4. Token-sorted ratio (handles "First Last" vs "Last, First")

    Args:
        name: New artist name to match.
        existing_artists: List of already-extracted artist names.
        threshold: Similarity score threshold (0.0-1.0).

    Returns:
        Matching artist name from existing dataset, or None if no match.
    """
    ...
```

### 2.3 Handle Multi-Location Galleries

Many galleries operate in multiple cities. This matters for artist-gallery relationships.

```python
# Known multi-location galleries and their canonical location codes
MULTI_LOCATION_GALLERIES = {
    "Clearing": {"New York", "Los Angeles", "Brussels"},
    "David Zwirner": {"New York", "London", "Paris", "Hong Kong", "Los Angeles"},
    "Carpenter's Workshop Gallery": {"New York", "London", "Paris", "San Francisco"},
    "Tiger Strikes Asteroid": {"Philadelphia", "New York", "Los Angeles", "Chicago", "Greenville"},
    "Winston Wächter Fine Art": {"New York", "Seattle"},
    "Mana Contemporary": {"Jersey City", "Chicago"},
}


def extract_location(exhibition_text: str, gallery_name: str) -> str:
    """
    Extract gallery location from exhibition text.

    Falls back to gallery's known locations if text doesn't specify.
    """
    known = MULTI_LOCATION_GALLERIES.get(gallery_name, set())
    text_lower = exhibition_text.lower()

    for location in known:
        if location.lower() in text_lower:
            return location

    return "UNKNOWN"
```

### 2.4 Handle Edge Cases in Artist Names

Real-world gallery data contains names that break naive parsing:

```python
EDGE_CASE_PATTERNS = {
    # Collaborative duos (keep as one entry)
    "duo": r"(\w+(?:\s\w+)+)\s*(?:&|and)\s*(\w+(?:\s\w+)+)",
    # e.g., "Daniel Dewar & Grégory Gicquel" → one artist entry

    # Artist collectives (keep as one entry)
    "collective": {"Slavs and Tatars", "DIS", "Raqs Media Collective"},

    # Names with non-standard characters
    "special_chars": r"[A-Za-zÀ-ÿ\-'.\s]+",

    # East Asian names (may have 3+ name parts, all capitalized)
    "east_asian": r"[A-Z][a-z]+ (?:[A-Z][a-z]+ ){1,2}[A-Z][a-z]+",

    # Names with particles that should NOT be split
    "particles": {"van", "von", "de", "del", "di", "le", "la", "el", "al", "bin", "d'"},
}
```

---

## Phase 3: Data Validation & Cleaning

### 3.1 Name Validation Pipeline

Before adding an artist to the database:

```python
import re
import unicodedata
from typing import Optional


# Characters allowed in artist names (broad international support)
VALID_NAME_CHARS = re.compile(
    r"^[A-Za-zÀ-ÿĀ-žА-яÆæØøÅå\s\-'&.,()0-9]+$"
)

# Common parsing artifacts to reject
PARSING_ARTIFACTS = {
    "works by", "an exhibition", "curated by", "presented by",
    "courtesy of", "installation view", "press release",
    "opening reception", "gallery hours",
}


def validate_artist_name(name: str) -> tuple[bool, Optional[str]]:
    """
    Validate artist name with multi-stage checks.

    Returns:
        (is_valid, error_message)
    """
    if not name or not name.strip():
        return False, "Empty name"

    name = name.strip()

    if len(name) < 3:
        return False, f"Name too short (likely parse error): '{name}'"

    if len(name) > 255:
        return False, f"Name too long: {len(name)} chars"

    if not VALID_NAME_CHARS.match(name):
        return False, f"Invalid characters in name: '{name}'"

    if name.startswith(",") or name.endswith(","):
        return False, f"Trailing/leading comma: '{name}'"

    # Check for parsing artifacts accidentally captured as names
    name_lower = name.lower()
    for artifact in PARSING_ARTIFACTS:
        if artifact in name_lower:
            return False, f"Parsing artifact detected: '{name}'"

    # Check for suspiciously short single-word names
    if " " not in name and len(name) < 5:
        return False, f"Likely incomplete name (single short word): '{name}'"

    return True, None


def normalize_name(name: str) -> str:
    """
    Normalize name for comparison while preserving display form.

    Note: This normalizes for MATCHING, not for display. Keep the
    original form for the database; use this for dedup comparisons.
    """
    name = " ".join(name.split())
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = " ".join(word.capitalize() for word in name.split())
    return name
```

### 3.2 Deduplication Strategy

```python
from difflib import SequenceMatcher


def find_duplicates(
    artist_name: str,
    existing_names: list[str],
    threshold: float = 0.85,
) -> list[tuple[str, float]]:
    """
    Find potential duplicates using multi-strategy fuzzy matching.

    Strategies:
    1. Exact match (case-insensitive)
    2. Normalized match (strip accents)
    3. SequenceMatcher ratio
    4. Token-sorted comparison ("First Last" vs "Last, First")

    Returns:
        List of (existing_name, similarity_score) tuples, sorted by score.
    """
    candidates = []
    normalized_new = normalize_name(artist_name)

    for existing in existing_names:
        # Strategy 1: Exact
        if artist_name.lower() == existing.lower():
            candidates.append((existing, 1.0))
            continue

        # Strategy 2: Normalized exact
        normalized_existing = normalize_name(existing)
        if normalized_new == normalized_existing:
            candidates.append((existing, 0.99))
            continue

        # Strategy 3: Sequence ratio
        ratio = SequenceMatcher(None, normalized_new.lower(), normalized_existing.lower()).ratio()

        # Strategy 4: Token-sorted (handles "Last, First" vs "First Last")
        tokens_new = sorted(normalized_new.lower().split())
        tokens_existing = sorted(normalized_existing.lower().split())
        token_ratio = SequenceMatcher(None, " ".join(tokens_new), " ".join(tokens_existing)).ratio()

        best_score = max(ratio, token_ratio)
        if best_score >= threshold:
            candidates.append((existing, best_score))

    return sorted(candidates, key=lambda x: x[1], reverse=True)
```

### 3.3 Validation Report

```python
import json
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ValidationReport:
    """Track all validation outcomes for audit trail."""

    valid_artists: list[dict] = field(default_factory=list)
    invalid_artists: list[dict] = field(default_factory=list)
    duplicates: list[dict] = field(default_factory=list)
    warnings: list[dict] = field(default_factory=list)
    gallery_name: str = ""
    extraction_date: str = ""

    def add_valid(self, name: str, source_exhibition: str) -> None:
        self.valid_artists.append({"name": name, "source": source_exhibition})

    def add_invalid(self, name: str, reason: str, source_exhibition: str) -> None:
        self.invalid_artists.append({
            "name": name, "reason": reason, "source": source_exhibition,
        })
        logger.warning("Invalid artist: %s — %s (from %s)", name, reason, source_exhibition)

    def add_duplicate(self, new_name: str, existing_name: str, similarity: float) -> None:
        self.duplicates.append({
            "new": new_name, "existing": existing_name, "similarity": round(similarity, 3),
        })

    def add_warning(self, message: str, context: str) -> None:
        self.warnings.append({"message": message, "context": context})

    @property
    def pass_rate(self) -> float:
        total = len(self.valid_artists) + len(self.invalid_artists)
        return len(self.valid_artists) / total if total else 0.0

    def summary(self) -> str:
        return (
            f"\nValidation Report — {self.gallery_name} ({self.extraction_date})\n"
            f"{'=' * 60}\n"
            f"Valid:               {len(self.valid_artists)}\n"
            f"Invalid:             {len(self.invalid_artists)}\n"
            f"Potential Duplicates: {len(self.duplicates)}\n"
            f"Warnings:            {len(self.warnings)}\n"
            f"Pass Rate:           {self.pass_rate:.1%}\n"
            f"{'=' * 60}\n\n"
            f"Invalid Entries:\n{json.dumps(self.invalid_artists, indent=2)}\n\n"
            f"Potential Duplicates (manual review needed):\n"
            f"{json.dumps(self.duplicates, indent=2)}\n"
        )

    def save(self, path: str) -> None:
        """Save full report to JSON for audit trail."""
        with open(path, "w") as f:
            json.dump({
                "gallery": self.gallery_name,
                "date": self.extraction_date,
                "valid": self.valid_artists,
                "invalid": self.invalid_artists,
                "duplicates": self.duplicates,
                "warnings": self.warnings,
                "pass_rate": self.pass_rate,
            }, f, indent=2)
```

---

## Phase 4: Resumable Process with Checkpoints

### 4.1 Checkpoint System

```python
import sqlite3
from datetime import datetime


class ExtractionCheckpoint:
    """SQLite-backed checkpoint for resumable extraction."""

    def __init__(self, gallery_name: str, checkpoint_dir: str = ".extraction_checkpoints"):
        self.db_path = f"{checkpoint_dir}/{gallery_name}.db"
        self._ensure_dir(checkpoint_dir)
        self._init_db()

    @staticmethod
    def _ensure_dir(path: str) -> None:
        import os
        os.makedirs(path, exist_ok=True)

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS processed_exhibitions (
                    exhibition_id TEXT PRIMARY KEY,
                    exhibition_name TEXT,
                    processed_at TIMESTAMP,
                    artists_count INTEGER,
                    status TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS processed_artists (
                    artist_name TEXT,
                    exhibition_id TEXT,
                    extracted_at TIMESTAMP,
                    validation_status TEXT,
                    PRIMARY KEY (artist_name, exhibition_id)
                )
            """)

    def mark_exhibition_done(
        self,
        exhibition_id: str,
        exhibition_name: str,
        artists_count: int,
        status: str = "success",
    ) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO processed_exhibitions VALUES (?, ?, ?, ?, ?)",
                (exhibition_id, exhibition_name, datetime.now().isoformat(), artists_count, status),
            )

    def is_exhibition_done(self, exhibition_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT status FROM processed_exhibitions WHERE exhibition_id = ? AND status = 'success'",
                (exhibition_id,),
            ).fetchone()
            return row is not None

    def get_remaining_exhibitions(self, all_exhibition_ids: list[str]) -> list[str]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT exhibition_id FROM processed_exhibitions WHERE status = 'success'"
            ).fetchall()
            processed = {row[0] for row in rows}
        return [eid for eid in all_exhibition_ids if eid not in processed]

    def get_stats(self) -> dict:
        with sqlite3.connect(self.db_path) as conn:
            total = conn.execute("SELECT COUNT(*) FROM processed_exhibitions").fetchone()[0]
            success = conn.execute(
                "SELECT COUNT(*) FROM processed_exhibitions WHERE status = 'success'"
            ).fetchone()[0]
            failed = conn.execute(
                "SELECT COUNT(*) FROM processed_exhibitions WHERE status != 'success'"
            ).fetchone()[0]
            artists = conn.execute("SELECT COUNT(DISTINCT artist_name) FROM processed_artists").fetchone()[0]
        return {"total": total, "success": success, "failed": failed, "unique_artists": artists}
```

### 4.2 Resume from Checkpoint

```python
import logging

logger = logging.getLogger(__name__)


def extract_with_resume(
    gallery_name: str,
    all_exhibitions: list[Exhibition],
    extraction_fn: callable,
    resume: bool = True,
) -> list[str]:
    """
    Extract artists with checkpoint support.

    Args:
        gallery_name: Gallery identifier.
        all_exhibitions: Complete list of exhibitions.
        extraction_fn: Function to extract artists from one exhibition.
        resume: If True, skip already-processed exhibitions.

    Returns:
        List of all extracted artist names (across all exhibitions).
    """
    checkpoint = ExtractionCheckpoint(gallery_name)
    all_artists = []

    if resume:
        remaining_ids = checkpoint.get_remaining_exhibitions([ex.title for ex in all_exhibitions])
        exhibitions_to_process = [ex for ex in all_exhibitions if ex.title in remaining_ids]
        stats = checkpoint.get_stats()
        logger.info(
            "Resuming: %d/%d exhibitions remaining (%d already processed, %d failed)",
            len(remaining_ids), len(all_exhibitions), stats["success"], stats["failed"],
        )
    else:
        exhibitions_to_process = all_exhibitions

    for i, exhibition in enumerate(exhibitions_to_process, 1):
        try:
            artists = extraction_fn(exhibition)
            all_artists.extend(artists)
            checkpoint.mark_exhibition_done(exhibition.title, exhibition.title, len(artists), "success")
            logger.info("[%d/%d] %s: %d artists", i, len(exhibitions_to_process), exhibition.title, len(artists))
        except Exception as e:
            checkpoint.mark_exhibition_done(exhibition.title, exhibition.title, 0, f"failed: {e}")
            logger.error("[%d/%d] %s: FAILED — %s", i, len(exhibitions_to_process), exhibition.title, e)

    return all_artists
```

---

## Phase 5: Execution Workflow

### 5.1 Complete Extraction Pipeline

```python
from datetime import datetime


def full_extraction_pipeline(
    config: GalleryConfig,
    existing_csv_path: str = "data/artists-consolidated.csv",
    resume: bool = True,
) -> tuple[list[str], ValidationReport]:
    """
    Complete end-to-end extraction pipeline.

    Args:
        config: Gallery extraction configuration.
        existing_csv_path: Path to existing artists CSV for dedup.
        resume: If True, resume from last checkpoint.

    Returns:
        (deduplicated_artists, validation_report)
    """
    report = ValidationReport(
        gallery_name=config.gallery_name,
        extraction_date=datetime.now().isoformat(),
    )

    # 1. Fetch all exhibitions
    print(f"[1/6] Fetching exhibitions for {config.gallery_name}...")
    exhibitions = extract_exhibitions(config)
    print(f"  Found {len(exhibitions)} exhibitions")

    # 2. Check for /artists page (shortcut for represented artists)
    represented_artists = []
    if config.artists_page_url:
        print(f"[2/6] Checking dedicated artists page...")
        represented_artists = extract_from_artists_page(config)
        print(f"  Found {len(represented_artists)} represented artists")
    else:
        print(f"[2/6] No dedicated artists page — extracting from exhibitions only")

    # 3. Extract artist names with resume support
    print(f"[3/6] Extracting artists from exhibitions (with checkpoint)...")
    exhibition_artists = extract_with_resume(
        config.gallery_name, exhibitions,
        lambda ex: parse_artist_names(get_artist_text(ex, config)),
        resume=resume,
    )

    # 4. Merge represented + exhibition artists
    all_artists = list(set(represented_artists + exhibition_artists))
    print(f"  Total raw artists: {len(all_artists)}")

    # 5. Validate and normalize
    print(f"[4/6] Validating and normalizing names...")
    valid_artists = []
    for artist in all_artists:
        is_valid, error = validate_artist_name(artist)
        if is_valid:
            valid_artists.append(artist)
            report.add_valid(artist, config.gallery_name)
        else:
            report.add_invalid(artist, error, config.gallery_name)

    # 6. Deduplicate against existing dataset
    print(f"[5/6] Deduplicating ({len(valid_artists)} artists against existing data)...")
    existing_artists = load_existing_artists(existing_csv_path)
    deduplicated = []

    for artist in valid_artists:
        duplicates = find_duplicates(artist, deduplicated + existing_artists, threshold=0.85)
        if duplicates:
            report.add_duplicate(artist, duplicates[0][0], duplicates[0][1])
        else:
            deduplicated.append(artist)

    print(f"  Deduplicated: {len(valid_artists)} -> {len(deduplicated)} new artists")

    # 7. Generate report
    print(f"[6/6] Generating validation report...")
    print(report.summary())

    report_path = f"data/extraction_report_{config.gallery_name.lower()}_{datetime.now().strftime('%Y%m%d')}.json"
    report.save(report_path)
    print(f"  Full report saved to {report_path}")

    return deduplicated, report
```

### 5.2 Command-Line Interface

```python
import argparse
import csv
from datetime import datetime


GALLERY_CONFIGS: dict[str, GalleryConfig] = {
    "clearing": GalleryConfig(
        gallery_name="CLEARING",
        base_url="https://www.c-l-e-a-r-i-n-g.com",
        exhibition_selector="div.exhibition-block",
        artist_list_selector="div.artist-list",
        artist_pattern=r"(?:^|\s|and\s)([A-Z][a-zà-ÿ]+(?:\s(?:de|von|van|d')\s)?(?:[A-Z][a-zà-ÿ]+\.?\s?)*[A-Z][a-zà-ÿ]+)",
        date_pattern=r"(\w+\s\d{1,2})\s*[-–]\s*(\w+\s\d{1,2},?\s\d{4})",
        pagination={"type": "infinite_scroll", "selector": "div.load-more"},
        locations=("New York", "Los Angeles", "Brussels"),
        artists_page_url=None,
    ),
    "david_zwirner": GalleryConfig(
        gallery_name="David Zwirner",
        base_url="https://www.davidzwirner.com",
        exhibition_selector="div.exhibition-item",
        artist_list_selector="h3.artist-name",
        artist_pattern=r"[A-Z][a-zà-ÿ]+(?:\s[A-Z][a-zà-ÿ]+)*",
        pagination={"type": "numbered_pages", "query_param": "page"},
        locations=("New York", "London", "Paris", "Hong Kong", "Los Angeles"),
        artists_page_url="https://www.davidzwirner.com/artists",
    ),
    "luhring_augustine": GalleryConfig(
        gallery_name="Luhring Augustine",
        base_url="https://www.luhringaugustine.com",
        exhibition_selector="div.exhibition",
        artist_list_selector="div.artist-list",
        artist_pattern=r"[A-Z][a-zà-ÿ]+(?:\s[A-Z][a-zà-ÿ]+)*",
        locations=("New York",),
        artists_page_url="https://www.luhringaugustine.com/artists",
    ),
}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract artists from gallery websites")
    parser.add_argument("gallery", help="Gallery key (e.g., 'clearing')")
    parser.add_argument("--url", help="Override gallery base URL")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument("--validate-only", action="store_true", help="Validate existing data only")
    parser.add_argument("--output", default="data/extracted_artists.csv", help="Output CSV path")
    parser.add_argument("--existing", default="data/artists-consolidated.csv", help="Existing artists CSV")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be extracted without writing")

    args = parser.parse_args()

    config = GALLERY_CONFIGS.get(args.gallery.lower())
    if not config:
        print(f"Unknown gallery: {args.gallery}")
        print(f"Available: {', '.join(GALLERY_CONFIGS.keys())}")
        exit(1)

    if args.url:
        config = GalleryConfig(**{**vars(config), "base_url": args.url})

    artists, report = full_extraction_pipeline(config, args.existing, resume=args.resume)

    if args.dry_run:
        print(f"\n[DRY RUN] Would write {len(artists)} artists to {args.output}")
        for a in artists[:20]:
            print(f"  - {a}")
        if len(artists) > 20:
            print(f"  ... and {len(artists) - 20} more")
        exit(0)

    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["artist_name", "gallery", "extraction_date"])
        writer.writeheader()
        for artist in artists:
            writer.writerow({
                "artist_name": artist,
                "gallery": config.gallery_name,
                "extraction_date": datetime.now().isoformat(),
            })

    print(f"\nExtraction complete: {len(artists)} artists -> {args.output}")
```

---

## Phase 6: Gallery Configuration Library

### 6.1 Reusable Gallery Profiles

See the `GALLERY_CONFIGS` dict in Phase 5.2 above. To add a new gallery:

```python
# 1. Inspect the gallery website structure
# 2. Create a GalleryConfig with the appropriate selectors
# 3. Add to GALLERY_CONFIGS dict
# 4. Test with --dry-run first:
#    python extract_artists.py new_gallery --dry-run
```

### 6.2 Adding a New Gallery in 5 Minutes

```bash
# Step 1: Inspect
curl -s https://www.example-gallery.com/exhibitions | head -200

# Step 2: Add config to GALLERY_CONFIGS (see pattern above)

# Step 3: Dry run
python extract_artists.py example_gallery --dry-run

# Step 4: Full extraction
python extract_artists.py example_gallery --resume --output data/example_artists.csv

# Step 5: Review report
cat data/extraction_report_example_gallery_20260416.json | python -m json.tool
```

---

## Phase 7: Quality Assurance

### 7.1 Spot-Check Validation

```python
import random


def manual_spot_check(
    extracted_artists: list[str],
    sample_size: int = 10,
) -> dict:
    """
    Generate a random sample for manual verification.

    Returns:
        Dict with sample artists and verification instructions.
    """
    sample = random.sample(extracted_artists, min(sample_size, len(extracted_artists)))

    return {
        "sample_size": len(sample),
        "artists": sample,
        "verification_steps": [
            "Google '{artist_name} artist' — confirm they are a real visual artist",
            "Check if name spelling matches their official website/Instagram",
            "Verify they exhibited at the gallery (search gallery site for name)",
            "Flag any parsing errors (partial names, merged names, artifacts)",
        ],
    }
```

### 7.2 Automated Data Quality Checks

```python
def run_quality_checks(artists: list[str], gallery_name: str) -> list[str]:
    """
    Run automated quality checks and return list of warnings.

    Checks:
    1. No single-word names (likely parse errors)
    2. No names longer than 50 chars (likely merged entries)
    3. No all-caps or all-lowercase names
    4. No duplicate entries
    5. Minimum extraction threshold (at least 5 artists per gallery)
    """
    warnings = []

    for name in artists:
        if " " not in name:
            warnings.append(f"Single-word name: '{name}'")
        if len(name) > 50:
            warnings.append(f"Suspiciously long name: '{name}'")
        if name == name.upper() or name == name.lower():
            warnings.append(f"Bad capitalization: '{name}'")

    seen = set()
    for name in artists:
        if name.lower() in seen:
            warnings.append(f"Duplicate: '{name}'")
        seen.add(name.lower())

    if len(artists) < 5:
        warnings.append(f"Very few artists extracted ({len(artists)}) — check extraction logic")

    return warnings
```

### 7.3 Comparison Against Existing Dataset

```python
def compare_with_existing(
    new_artists: list[str],
    existing_csv: str,
    fuzzy_threshold: float = 0.85,
) -> dict:
    """Compare new extraction with existing artist dataset."""
    existing = load_csv(existing_csv)
    existing_names = [row["name"] for row in existing]

    newly_added = []
    potentially_duplicate = []

    for artist in new_artists:
        duplicates = find_duplicates(artist, existing_names, fuzzy_threshold)
        if duplicates:
            potentially_duplicate.append({
                "new": artist,
                "existing": duplicates[0][0],
                "similarity": duplicates[0][1],
            })
        else:
            newly_added.append(artist)

    return {
        "newly_added_count": len(newly_added),
        "potential_duplicates_count": len(potentially_duplicate),
        "newly_added": newly_added,
        "potential_duplicates": potentially_duplicate,
    }
```

---

## Phase 8: Gallery CSV Enrichment & Maintenance

This phase focuses specifically on maintaining `data/galleries-consolidated.csv`.

### 8.1 Current CSV Schema

```
id,name,slug,locations,country,type,website
```

### 8.2 Filling Missing Data

For galleries with empty `locations`, `country`, or `website` fields:

**Manual research workflow** (most reliable):
1. Google the gallery name
2. Check their website's "About" or "Contact" page for address
3. Cross-reference with Artsy, Artnet, or Google Maps
4. Fill in all three fields at once

**Semi-automated with Claude Code**:
```bash
# For each gallery missing data, search and fill:
# 1. WebSearch for "[gallery name] gallery location website"
# 2. Verify the website loads
# 3. Update the CSV row
```

### 8.3 Adding New Columns to the CSV (Future Enrichment)

Here are recommended new columns and how to populate them:

| Column | Description | How to Populate |
|--------|-------------|-----------------|
| `founded_year` | Year gallery opened | Gallery "About" page; Artsy profile; press mentions |
| `instagram` | Instagram handle | Search Instagram; usually linked on gallery website footer |
| `instagram_followers` | Follower count | Instagram API or manual check |
| `email` | Contact email | Gallery "Contact" page |
| `phone` | Contact phone | Gallery "Contact" page |
| `represented_artist_count` | Number of represented artists | Count from `/artists` page |
| `artsy_url` | Artsy profile URL | Search `artsy.net/partner/[slug]` |
| `artnet_url` | Artnet profile URL | Search `artnet.com/galleries/[name]` |
| `google_maps_url` | Google Maps link | Google Maps search for gallery address |
| `neighborhood` | Neighborhood (e.g., "LES", "Chelsea") | Derive from address; useful for local galleries |
| `status` | `active`, `closed`, `relocated` | Check if website loads; Google for recent shows |
| `last_verified` | Date data was last verified | Set to today when you update any field |
| `focus` | Gallery specialty (e.g., "contemporary", "photography") | Gallery "About" page; exhibition history |
| `primary_market` | `primary`, `secondary`, `both` | Gallery program description |

**Implementation strategy for new columns**:

```python
# Step 1: Add column to CSV with empty default
# Step 2: Populate from most-reliable source first

ENRICHMENT_SOURCES = {
    "website": [
        "gallery_website_about_page",    # Most authoritative
        "artsy_partner_profile",          # Well-maintained
        "google_maps",                    # Good for address/phone
        "instagram_bio",                  # Sometimes has website
    ],
    "founded_year": [
        "gallery_website_about_page",
        "artsy_partner_profile",
        "wikipedia",
        "press_articles",
    ],
    "instagram": [
        "gallery_website_footer",         # Usually linked
        "instagram_search",               # Search by name
        "artsy_partner_profile",          # Sometimes listed
    ],
    "neighborhood": [
        "google_maps_geocode",            # Reverse geocode address
        "manual_mapping",                 # Map address to neighborhood
    ],
    "status": [
        "gallery_website_check",          # Does it load?
        "recent_exhibition_check",        # Any shows in last 12 months?
        "google_news_search",             # Closure announcements
    ],
}
```

### 8.4 Automated Enrichment Script Template

```python
"""
Gallery CSV enrichment script.

Usage:
    python enrich_galleries.py --column website --source web_search
    python enrich_galleries.py --column founded_year --source artsy
    python enrich_galleries.py --verify-websites
    python enrich_galleries.py --add-column instagram
"""

import csv
import logging
from datetime import date
from pathlib import Path

logger = logging.getLogger(__name__)

CSV_PATH = Path("data/galleries-consolidated.csv")


def load_galleries() -> list[dict]:
    """Load galleries CSV into list of dicts."""
    with open(CSV_PATH) as f:
        return list(csv.DictReader(f))


def save_galleries(galleries: list[dict], fieldnames: list[str]) -> None:
    """Save galleries list back to CSV."""
    with open(CSV_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(galleries)


def add_column(column_name: str, default_value: str = "") -> None:
    """Add a new column to the CSV with a default value."""
    galleries = load_galleries()
    if not galleries:
        return

    fieldnames = list(galleries[0].keys())
    if column_name in fieldnames:
        logger.warning("Column '%s' already exists", column_name)
        return

    fieldnames.append(column_name)
    for gallery in galleries:
        gallery[column_name] = default_value

    save_galleries(galleries, fieldnames)
    logger.info("Added column '%s' to %d galleries", column_name, len(galleries))


def verify_websites() -> list[dict]:
    """Check which gallery websites are reachable."""
    import httpx

    galleries = load_galleries()
    results = []

    for gallery in galleries:
        url = gallery.get("website", "").strip()
        if not url:
            results.append({"name": gallery["name"], "status": "missing"})
            continue

        try:
            response = httpx.get(url, timeout=10, follow_redirects=True)
            results.append({
                "name": gallery["name"],
                "url": url,
                "status": response.status_code,
                "final_url": str(response.url),
            })
        except Exception as e:
            results.append({
                "name": gallery["name"],
                "url": url,
                "status": f"error: {e}",
            })

    return results


def find_missing(column: str) -> list[dict]:
    """Find galleries with missing values for a given column."""
    galleries = load_galleries()
    return [g for g in galleries if not g.get(column, "").strip()]
```

### 8.5 Data Freshness & Verification Schedule

| Check | Frequency | Method |
|-------|-----------|--------|
| Website reachability | Monthly | `verify_websites()` — flag 404s and redirects |
| Gallery status (active/closed) | Quarterly | Check for recent exhibitions on website |
| New galleries to add | Per-project | When new artist data references unknown galleries |
| Location accuracy | Annually | Cross-reference with Google Maps |
| Instagram handles | Quarterly | Verify handle still active; update follower count |

---

## Quick Reference: Checklist for New Gallery

When extracting artists from a new gallery:

- [ ] **Reconnaissance**: Identify exhibition listing format (pagination, SPA, CMS)
- [ ] **Check shortcuts**: Does the gallery have a `/artists` page? JSON-LD? REST API?
- [ ] **Extract metadata**: Map exhibition title, dates, location, artist list
- [ ] **Choose extraction method**: API > JSON-LD > HTML parsing > regex > headless browser
- [ ] **Build config**: Create `GalleryConfig` in `GALLERY_CONFIGS`
- [ ] **Dry run**: Test with `--dry-run` on 1-2 exhibitions; verify output
- [ ] **Handle edge cases**: Accents, particles, duos, collectives
- [ ] **Validate names**: Run `validate_artist_name()` on all entries
- [ ] **Implement checkpoint**: Set up resumable extraction with SQLite
- [ ] **Run full extraction**: Execute pipeline with `--resume` flag
- [ ] **Deduplicate**: Compare against existing artist dataset
- [ ] **Quality checks**: Run `run_quality_checks()` + manual spot-check of 10-20 names
- [ ] **Generate report**: Save validation JSON; document pass rate
- [ ] **Merge data**: Add new artists to `artists-consolidated.csv`
- [ ] **Update gallery CSV**: Ensure `galleries-consolidated.csv` has complete row for this gallery
- [ ] **Commit**: Document gallery profile and any issues encountered

---

## Quick Reference: Checklist for Gallery CSV Enrichment

When filling in missing data in `galleries-consolidated.csv`:

- [ ] **Identify gaps**: Run `find_missing("locations")`, `find_missing("website")`
- [ ] **Research each gallery**: Google name; check Artsy, Artnet, Google Maps
- [ ] **Verify websites**: Confirm URLs load and are current
- [ ] **Normalize locations**: Use city names consistently (e.g., "New York" not "NYC")
- [ ] **Handle multi-location**: Use semicolon-separated values (e.g., "New York; London")
- [ ] **Verify gallery status**: Is it still open? Has it moved?
- [ ] **Add new columns**: Use `add_column()` function; populate from most authoritative source
- [ ] **Set verification date**: Track when data was last confirmed accurate

---

## Common Pitfalls & Solutions

### Original 14 Pitfalls

| Pitfall | Solution |
|---------|----------|
| Artist names with accents (é, ö, ñ) | Use `unicodedata.normalize()` and broad regex character classes |
| Some shows list artists, others don't | Skip exhibitions with 0 artists; log as warning |
| Artist names with particles (von, de, van) | Include particles in regex: `(?:von\|de\|van\|d')\s` |
| Collaborative artist names (duo, collective) | Maintain allowlist of known collectives; allow `&` and `+` |
| Pagination has 100+ pages | Implement async fetching with rate limiting |
| Exhibition dates in various formats | Use `dateutil.parser.parse()` for flexible parsing |
| Missing location for multi-location galleries | Check exhibition description; default to primary location |
| Infinite scroll (AJAX loading) | Use Playwright to scroll + capture network requests |
| Gallery closed but still in CSV | Add `status` column; mark as `closed` with date |
| Website URL changed or redirects | Run `verify_websites()` monthly; update redirected URLs |
| SPA with empty HTML source | Use Playwright; or check Network tab for API calls |
| Names merged without separator | Check for suspiciously long names (>50 chars); split manually |
| Press-release style paragraphs | Use NLP/spaCy NER to extract person names from prose |
| "Curated by X" parsed as artist | Add "curated by" to `PARSING_ARTIFACTS` rejection list |

### 10 Critical Pitfalls (King's Leap Case Study)

#### 15. **Wrong Gallery URL Extracted — Pulled Affiliate/Redirect Instead of Primary**

**Problem**: King's Leap's website was listed as `https://www.kingsleapfinearts.com/` but the correct primary domain is `https://www.kingsleap.com`. The `/finearts` variant may be a redirect, old domain, or affiliate link that appeared in artist websites or external references.

**Why it happened**: 
- Extraction logic grabbed the first HTTPS URL found in scraped content without verifying it was the gallery's official site
- No canonical URL detection (checking for `<link rel="canonical">` or redirects)
- Didn't cross-reference against gallery's self-identified domain in `<meta>` tags or HTML title

**Solution**:
```python
def find_canonical_gallery_url(base_url: str, extracted_urls: list[str]) -> str:
    """
    Find the canonical gallery URL from a set of candidates.
    
    Prioritizes:
    1. URL that matches gallery slug/name exactly
    2. URL specified in <link rel="canonical">
    3. URL that 404s redirect to (follow redirects)
    4. URL that appears most frequently in scraped pages
    """
    import httpx
    
    # Check for canonical link in main page
    try:
        response = httpx.get(base_url, follow_redirects=True, timeout=10)
        if "canonical" in response.text:
            canonical = re.search(r'<link rel="canonical" href="([^"]+)"', response.text)
            if canonical:
                return canonical.group(1).rstrip('/')
    except:
        pass
    
    # Verify each URL — wrong ones often 404 or redirect
    for url in sorted(extracted_urls):
        try:
            resp = httpx.head(url, follow_redirects=True, timeout=5)
            if resp.status_code == 200:
                # Trust URLs that load cleanly
                return url.rstrip('/')
        except:
            pass
    
    return base_url  # Fallback
```

#### 16. **Not Extracting from the Right Content Source — Missed `/exhibitions` Page**

**Problem**: King's Leap has two distinct content zones:
- Homepage (`/`) — may show featured artists or sidebar
- Exhibitions page (`/exhibitions`) — the actual artist roster with full historical context

Extraction logic only hit the homepage, missing 80%+ of the gallery's artists.

**Why it happened**:
- Config only specified `base_url` without identifying separate content pages
- Didn't check for common gallery URL patterns (`/exhibitions`, `/shows`, `/artists`, `/past-shows`)
- No reconnaissance phase to map the site structure before extraction

**Solution**:
```python
@dataclass
class GalleryConfig:
    # ... existing fields ...
    content_pages: tuple[str, ...] = (
        "/exhibitions",
        "/shows", 
        "/past-shows",
        "/artists",
    )
    
def discover_content_pages(gallery_url: str) -> list[str]:
    """
    Probe common gallery URL patterns to find where exhibitions live.
    """
    import httpx
    
    valid_pages = []
    for path in ["/exhibitions", "/shows", "/artists", "/past-shows", "/archive"]:
        try:
            resp = httpx.head(f"{gallery_url.rstrip('/')}{path}", timeout=5)
            if resp.status_code == 200:
                valid_pages.append(path)
        except:
            pass
    
    return valid_pages if valid_pages else ["/"]
```

#### 17. **Gallery URL Format Inconsistencies — www vs. non-www, HTTP vs. HTTPS, Trailing Slashes**

**Problem**: Same gallery reachable at:
- `https://www.kingsleap.com`
- `https://kingsleap.com`
- `http://kingsleap.com`
- `https://www.kingsleap.com/`

Extraction picks one variant; scraping fails if the canonical differs.

**Solution**:
```python
def normalize_url(url: str) -> str:
    """Normalize URL to canonical form for comparison."""
    from urllib.parse import urlparse, urlunparse
    
    parsed = urlparse(url)
    
    # Enforce HTTPS
    scheme = "https"
    
    # Prefer www for consistency
    netloc = parsed.netloc
    if not netloc.startswith("www."):
        netloc = f"www.{netloc}"
    
    # Remove trailing slashes from path
    path = parsed.path.rstrip("/") or "/"
    
    return urlunparse((scheme, netloc, path, "", "", ""))
```

#### 18. **Shallow Reconnaissance — Didn't Check for API or JSON-LD Before HTML Scraping**

**Problem**: Many modern galleries expose exhibition data via:
- REST API endpoint (`/api/exhibitions`)
- JSON-LD structured data (`<script type="application/ld+json">`)
- GraphQL endpoint

Extraction blindly scraped HTML with regex instead of using the cleanest source.

**Solution**:
```python
def check_structured_data_first(gallery_url: str) -> Optional[dict]:
    """
    Before HTML parsing, check for structured data.
    Returns JSON-LD exhibitions if found.
    """
    import httpx
    import json
    
    try:
        resp = httpx.get(gallery_url, timeout=10)
        
        # Look for JSON-LD
        matches = re.findall(
            r'<script type="application/ld\+json">(.+?)</script>',
            resp.text,
            re.DOTALL
        )
        for match in matches:
            data = json.loads(match)
            if data.get("@type") == "Exhibition" or "exhibition" in str(data).lower():
                return data
    except:
        pass
    
    return None
```

#### 19. **Extracted URL is Shortlink or Redirect — Didn't Follow to Final Destination**

**Problem**: Some galleries use URL shorteners or redirects in their content:
- `https://bit.ly/xyz` → actual artist website
- `https://kingsleap.com/go/artist-name` → redirects to external portfolio

Extraction stores the intermediate URL instead of the final, useful URL.

**Solution**:
```python
def resolve_url(url: str, max_redirects: int = 5) -> str:
    """Follow redirects to the final destination URL."""
    import httpx
    
    try:
        resp = httpx.head(url, follow_redirects=True, timeout=10)
        return str(resp.url).rstrip('/')
    except:
        return url  # Return original if resolution fails
```

#### 20. **No Domain Whitelist — Accepted URLs from Unrelated Sites**

**Problem**: When extracting links from a gallery page, accidentally grabbed:
- Ad tracking URLs (`tracking.example.com/ref/artist`)
- CDN URLs (`cdn.cloudflare.com/...`)
- Analytics links (`google-analytics.com`)

These pollute the website dataset.

**Solution**:
```python
DOMAIN_WHITELIST = {
    # Real artist portfolio domains
    "squarespace.com", "wix.com", "wordpress.com", "cargo.site",
    "behance.net", "artsy.net", "instagram.com", "facebook.com",
    # Plus custom domains (high signal)
}

DOMAIN_BLACKLIST = {
    # Ad/tracking/CDN networks
    "doubleclick.net", "google-analytics.com", "facebook.com/tr",
    "cloudflare.com", "unpkg.com", "cdn.",
    "bit.ly", "tinyurl.com", "short.link",
}

def is_valid_artist_website(url: str) -> bool:
    """Filter URLs to likely artist portfolios."""
    from urllib.parse import urlparse
    
    parsed = urlparse(url)
    domain = parsed.netloc.lstrip("www.")
    
    # Reject known ad/tracking domains
    if any(bad in domain for bad in DOMAIN_BLACKLIST):
        return False
    
    # Accept known portfolio platforms + custom domains
    if any(good in domain for good in DOMAIN_WHITELIST):
        return True
    
    # Custom domains usually good (has extension, reasonable length)
    if "." in domain and len(domain) > 5 and len(domain) < 60:
        return True
    
    return False
```

#### 21. **Hardcoded Selectors Break on Site Redesign — No Fallback Extraction**

**Problem**: Gallery redesigned their website. CSS selector `div.artist-item` no longer exists. Extraction fails silently with 0 results, no error raised.

**Why it happened**: No validation that selectors matched any elements before extraction. No fallback to generic selectors (e.g., `a[href*="/artists/"]`).

**Solution**:
```python
def extract_with_fallback(config: GalleryConfig, html: str) -> list[str]:
    """
    Try primary extraction method; fall back to generic patterns on failure.
    """
    # Try primary config selector
    soup = BeautifulSoup(html, "html.parser")
    results = soup.select(config.artist_list_selector)
    
    if results and len(results) > 1:
        return results  # Success
    
    # Fallback 1: Look for elements with "artist" in class/id
    fallback1 = soup.find_all(attrs={"class": re.compile("artist", re.I)})
    if fallback1 and len(fallback1) > 2:
        return fallback1
    
    # Fallback 2: Find links matching artist URL patterns
    fallback2 = soup.find_all("a", href=re.compile(config.artist_link_regex or r"/artists?/"))
    if fallback2 and len(fallback2) > 2:
        return fallback2
    
    # If all fail, raise error instead of silently returning empty
    raise ExtractionError(
        f"No results from primary selector ({config.artist_list_selector}) "
        f"and fallback methods failed. Site may have been redesigned."
    )
```

#### 22. **Duplicate URL Variants in Output — Same Site, Different Capitalization/Params**

**Problem**: Extracted both:
- `https://www.KingsLeap.com`
- `https://www.kingsleap.com`
- `https://www.kingsleap.com?utm_source=gallery`
- `https://www.kingsleap.com/`

As separate entries, creating duplicates.

**Solution**:
```python
def deduplicate_urls(urls: list[str]) -> list[str]:
    """Normalize and deduplicate URLs."""
    from urllib.parse import urlparse, urlunparse
    
    normalized = set()
    for url in urls:
        parsed = urlparse(url.lower())
        # Remove query params and fragments
        clean = urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path.rstrip('/'),
            "",  # params
            "",  # query
            ""   # fragment
        ))
        normalized.add(clean)
    
    return sorted(normalized)
```

#### 23. **No Timeout on Long-Running Extractions — Hangs on Unresponsive Galleries**

**Problem**: One gallery's server was slow. Extraction hung for 30+ minutes waiting for a response, tying up the entire batch job.

**Solution**: Always set timeouts; implement per-gallery extraction timeout:
```python
def extract_exhibitions_with_timeout(config: GalleryConfig, timeout: int = 30) -> list[Exhibition]:
    """Extract with configurable timeout per gallery."""
    from signal import signal, SIGALRM
    
    def timeout_handler(signum, frame):
        raise TimeoutError(f"Extraction exceeded {timeout}s")
    
    signal(SIGALRM, timeout_handler)
    signal(SIGALRM, timeout)
    
    try:
        return extract_exhibitions(config)
    finally:
        signal(SIGALRM, 0)  # Cancel alarm
```

#### 24. **No Logging of Extraction Confidence — Silent Errors on Marginal Data**

**Problem**: Extraction "succeeded" with only 3 artists when it should have found 40. No flag to indicate low confidence. Data merged without review.

**Solution**:
```python
@dataclass
class ExtractionResult:
    artists: list[str]
    confidence: float  # 0.0-1.0
    warnings: list[str]
    error_count: int
    
    @property
    def is_reliable(self) -> bool:
        """Flag suspicious extractions."""
        return (
            self.confidence >= 0.85 and
            self.error_count == 0 and
            len(self.artists) >= 5  # Minimum threshold
        )

# Flag low-confidence results for manual review
if not result.is_reliable:
    logger.warning(
        "Low confidence extraction for %s: confidence=%.1f%%, %d errors",
        config.gallery_name, result.confidence * 100, result.error_count
    )
    result.warnings.append("Manual verification recommended")
```

#### 25. **No Test Suite for Extraction Logic — Regressions Undetected**

**Problem**: Someone changed the artist name regex. Extraction broke silently. No test caught it because the module was never tested against known output.

**Solution**: Create regression test suite:
```python
# tests/test_extractions.py
KNOWN_GALLERIES = {
    "clearing": {
        "url": "https://www.c-l-e-a-r-i-n-g.com",
        "expected_min_artists": 100,
        "known_artists": ["Uri Aran", "Ellen Berkenblit", "Nicholas Campbell"],
    },
    "king_leap": {
        "url": "https://www.kingsleap.com",
        "expected_min_artists": 20,
        "known_artists": ["Artist Name 1", "Artist Name 2"],
    },
}

def test_extraction_coverage():
    """Ensure extraction finds known artists."""
    for gallery, specs in KNOWN_GALLERIES.items():
        config = load_config(gallery)
        artists = extract_exhibitions(config)
        
        # Check quantity
        assert len(artists) >= specs["expected_min_artists"], \
            f"{gallery}: expected {specs['expected_min_artists']}, got {len(artists)}"
        
        # Check known artists present
        for known in specs["known_artists"]:
            assert any(known.lower() in artist.lower() for artist in artists), \
                f"{gallery}: missing known artist '{known}'"
```

---

## Example: Full CLEARING Extraction

```bash
# Initial run
python extract_artists.py clearing --output data/clearing_artists.csv

# Resume (if interrupted)
python extract_artists.py clearing --resume --output data/clearing_artists.csv

# Dry run (preview only)
python extract_artists.py clearing --dry-run

# Validation only
python extract_artists.py clearing --validate-only
```

Expected output:
```
[1/6] Fetching exhibitions for CLEARING...
  Found 87 exhibitions
[2/6] No dedicated artists page — extracting from exhibitions only
[3/6] Extracting artists from exhibitions (with checkpoint)...
  [1/87] SEASONS 20: MUCH LOVE (Aug 2024): 33 artists
  [2/87] SEASONS 19: ... (July 2024): 28 artists
  ...
[4/6] Validating and normalizing names...
  Valid: 168 | Invalid: 3 | Warnings: 2
[5/6] Deduplicating (168 artists against existing data)...
  Deduplicated: 168 -> 152 new artists (16 potential duplicates flagged)
[6/6] Generating validation report...

Validation Report — CLEARING (2026-04-16T14:30:00)
============================================================
Valid:               168
Invalid:             3
Potential Duplicates: 16
Warnings:            2
Pass Rate:           98.2%
============================================================

  Full report saved to data/extraction_report_clearing_20260416.json

Extraction complete: 152 artists -> data/clearing_artists.csv
```

---

## References

- Python: `re`, `difflib`, `unicodedata`, `sqlite3`, `csv`, `dataclasses`
- Web scraping: `BeautifulSoup4`, `httpx`, `playwright` (for dynamic content)
- Fuzzy matching: `thefuzz` (successor to `fuzzywuzzy`), `python-Levenshtein`
- NLP (for press-release parsing): `spaCy` with `en_core_web_sm` model
- Data validation: `pydantic`
- Date parsing: `python-dateutil`
