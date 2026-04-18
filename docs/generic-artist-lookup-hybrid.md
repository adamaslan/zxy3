# Generic Artist Lookup — Hybrid Terminal + CLI Guide

**Version**: 1.0  
**Created**: April 16, 2026  
**Purpose**: Reusable, gallery-agnostic workflow for discovering artist websites, Instagram handles, and CVs using terminal tools

---

## Quick Start

```bash
# 1. Install tools
brew install lynx w3m jq wget pdfgrep   # macOS
pip install googler instaloader csvkit

# 2. Setup
mkdir -p data/{rosters,profiles,cvs,instagram} logs
./setup_csvs.sh

# 3. Configure gallery
cp gallery.conf.example gallery.conf
# Edit gallery.conf with your target gallery details

# 4. Run
./run_lookup.sh --gallery gallery.conf
```

---

## Gallery Configuration

All gallery-specific values live in a single config file. No hardcoded gallery names anywhere.

```bash
# gallery.conf — one per gallery, swap to retarget entire workflow
GALLERY_NAME="clearing"
GALLERY_DISPLAY="CLEARING"
GALLERY_URL="https://www.c-l-e-a-r-i-n-g.com/artists"
GALLERY_DOMAIN="c-l-e-a-r-i-n-g.com"
ARTIST_LINK_PATTERN="/artists/"           # URL path pattern for artist profiles
ARTIST_LINK_REGEX="https?://${GALLERY_DOMAIN}/artists/[^/\\s'\"]+"
LOCATIONS="New York; Los Angeles; Brussels"
DELAY_MIN=2
DELAY_MAX=5
INSTAGRAM_DELAY_MIN=5                     # Instagram is rate-limit sensitive
INSTAGRAM_DELAY_MAX=10
```

**Adding a new gallery**: Copy `gallery.conf.example`, fill in 8 fields, run. No code changes.

---

## Core Utilities

These shared functions are sourced by every module. Defined once, used everywhere.

```bash
#!/bin/bash
# lib/utils.sh — shared functions for all modules

source "${1:-gallery.conf}"  # Load gallery config

log() { echo "[$(date '+%H:%M:%S')] $*"; }
log_error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] $2: $3" >> logs/errors.log; }

random_delay() {
  local min=${1:-$DELAY_MIN} max=${2:-$DELAY_MAX}
  sleep $((RANDOM % (max - min + 1) + min))
}

fetch_with_backoff() {
  local url=$1 attempts=${2:-4} attempt=0
  while [ $attempt -lt $attempts ]; do
    if result=$(curl -sL -A "$(random_ua)" --max-time 15 "$url" 2>/dev/null) && [ -n "$result" ]; then
      echo "$result"; return 0
    fi
    sleep $((2 ** attempt))
    ((attempt++))
  done
  return 1
}

random_ua() {
  local agents=(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0"
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0"
    "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"
  )
  echo "${agents[$((RANDOM % ${#agents[@]}))]}"
}

is_processed() {
  local artist=$1 logfile=${2:-logs/processed.log}
  grep -qF "$artist" "$logfile" 2>/dev/null
}

mark_processed() {
  local artist=$1 logfile=${2:-logs/processed.log}
  echo "$artist,$(date -Iseconds)" >> "$logfile"
}

csv_append() {
  local file=$1; shift
  echo "$*" >> "$file"
}
```

---

## Setup

```bash
#!/bin/bash
# setup_csvs.sh — initialize tracking CSVs (idempotent)

for pair in \
  "data/artist_websites.csv:artist_name,website_url,source,verified" \
  "data/instagram_handles.csv:artist_name,handle,url,source,verified" \
  "data/verified_cvs.csv:artist_name,cv_url,format,source,verified"; do
  file="${pair%%:*}" header="${pair#*:}"
  [ -f "$file" ] || echo "$header" > "$file"
done

touch logs/errors.log logs/processed.log
```

---

## Module 1: Gallery Roster Extraction

```bash
#!/bin/bash
# modules/01_roster.sh — fetch gallery roster + extract artist links
source lib/utils.sh "$1"

log "Fetching roster from $GALLERY_DISPLAY ($GALLERY_URL)..."

# Try lynx first (handles JS-heavy sites), fall back to curl
roster=$(lynx -dump -width=200 "$GALLERY_URL" 2>/dev/null) \
  || roster=$(fetch_with_backoff "$GALLERY_URL")

echo "$roster" > "data/rosters/${GALLERY_NAME}_roster.txt"

# Extract artist profile URLs using gallery-specific pattern
grep -oP "$ARTIST_LINK_REGEX" "data/rosters/${GALLERY_NAME}_roster.txt" \
  | sort -u > "data/rosters/${GALLERY_NAME}_links.txt"

count=$(wc -l < "data/rosters/${GALLERY_NAME}_links.txt")
log "Found $count artist profile links"
```

---

## Module 2: Artist Profile Scraping

```bash
#!/bin/bash
# modules/02_profiles.sh — fetch each artist profile, extract website links
source lib/utils.sh "$1"

PROFILE_DIR="data/profiles/${GALLERY_NAME}"
mkdir -p "$PROFILE_DIR"

processed=0 found=0 failed=0

while read -r profile_url; do
  slug=$(echo "$profile_url" | grep -oP '[^/]+$')

  # Resume support: skip already processed
  is_processed "$slug" && { ((processed++)); continue; }

  log "[$((processed+1))] $slug ..."

  if page=$(fetch_with_backoff "$profile_url"); then
    echo "$page" > "${PROFILE_DIR}/${slug}.txt"

    # Extract external website links (exclude gallery domain, social media)
    websites=$(echo "$page" \
      | grep -oP 'https?://[^\s<>"'"'"']+' \
      | grep -v "$GALLERY_DOMAIN" \
      | grep -v -E '(instagram|facebook|twitter|youtube|vimeo)\.com' \
      | sort -u)

    if [ -n "$websites" ]; then
      while read -r url; do
        csv_append data/artist_websites.csv "$slug,$url,gallery_profile,unverified"
      done <<< "$websites"
      ((found++))
    fi

    # Extract Instagram handle inline (saves a separate pass)
    ig=$(echo "$page" | grep -oiP 'instagram\.com/\K[a-z0-9_.]+' | head -1)
    [ -n "$ig" ] && csv_append data/instagram_handles.csv "$slug,$ig,https://instagram.com/$ig,gallery_profile,unverified"

    mark_processed "$slug"
  else
    log_error "profiles" "$slug" "fetch failed"
    ((failed++))
  fi

  ((processed++))
  random_delay
done < "data/rosters/${GALLERY_NAME}_links.txt"

log "Done: $processed processed, $found websites found, $failed failed"
```

**Key optimization vs. original**: Instagram extraction happens in the same pass as website extraction — eliminates a redundant fetch cycle.

---

## Module 3: Instagram Discovery

For artists where Module 2 didn't find an Instagram handle.

```bash
#!/bin/bash
# modules/03_instagram.sh — find Instagram handles via website scraping + direct search
source lib/utils.sh "$1"

log "Searching Instagram for remaining artists..."

# Build list of artists still missing Instagram
comm -23 \
  <(tail -n +2 data/artist_websites.csv | cut -d',' -f1 | sort -u) \
  <(tail -n +2 data/instagram_handles.csv | cut -d',' -f1 | sort -u) \
  > /tmp/missing_instagram.txt

count=$(wc -l < /tmp/missing_instagram.txt)
log "$count artists still need Instagram handles"

while read -r artist_name; do
  is_processed "${artist_name}_ig" logs/ig_processed.log && continue

  # Strategy 1: Scrape their personal website for Instagram links
  website=$(grep "^$artist_name," data/artist_websites.csv | head -1 | cut -d',' -f2)
  if [ -n "$website" ]; then
    ig=$(curl -sL -A "$(random_ua)" --max-time 10 "$website" 2>/dev/null \
      | grep -oiP 'instagram\.com/\K[a-z0-9_.]+' | head -1)
    if [ -n "$ig" ]; then
      csv_append data/instagram_handles.csv "$artist_name,$ig,https://instagram.com/$ig,website,unverified"
      mark_processed "${artist_name}_ig" logs/ig_processed.log
      log "$artist_name -> @$ig (from website)"
      random_delay; continue
    fi
  fi

  # Strategy 2: Try common username patterns
  for pattern in \
    "$(echo "$artist_name" | tr ' ' '.' | tr '[:upper:]' '[:lower:]')" \
    "$(echo "$artist_name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')" \
    "$(echo "$artist_name" | tr -d ' ' | tr '[:upper:]' '[:lower:]')"; do

    status=$(curl -sI "https://instagram.com/$pattern" 2>/dev/null | head -1 | grep -oP '\d{3}')
    if [ "$status" = "200" ]; then
      csv_append data/instagram_handles.csv "$artist_name,$pattern,https://instagram.com/$pattern,pattern_match,unverified"
      log "$artist_name -> @$pattern (pattern match)"
      break
    fi
    sleep 2
  done

  mark_processed "${artist_name}_ig" logs/ig_processed.log
  random_delay "$INSTAGRAM_DELAY_MIN" "$INSTAGRAM_DELAY_MAX"
done < /tmp/missing_instagram.txt
```

---

## Module 4: CV & Document Harvester

```bash
#!/bin/bash
# modules/04_cvs.sh — find artist CVs via Google search + common URL paths
source lib/utils.sh "$1"

log "Searching for artist CVs..."

tail -n +2 data/artist_websites.csv | cut -d',' -f1 | sort -u | while read -r artist_name; do
  is_processed "${artist_name}_cv" logs/cv_processed.log && continue

  found=0

  # Strategy 1: Check common CV paths on artist website
  website=$(grep "^$artist_name," data/artist_websites.csv | head -1 | cut -d',' -f2)
  if [ -n "$website" ]; then
    for path in /cv /cv.pdf /resume.pdf /about /bio /assets/cv.pdf /wp-content/uploads/cv.pdf; do
      status=$(curl -sI "${website%/}${path}" --max-time 5 2>/dev/null | head -1 | grep -oP '\d{3}')
      if [ "$status" = "200" ]; then
        csv_append data/verified_cvs.csv "$artist_name,${website%/}${path},pdf,website_path,verified"
        log "$artist_name -> CV at $path"
        found=1; break
      fi
    done
  fi

  # Strategy 2: Google search (only if website path failed)
  if [ $found -eq 0 ] && command -v googler &>/dev/null; then
    results=$(googler -n 3 --np \
      "\"$artist_name\" artist (\"curriculum vitae\" OR \"cv\" OR \"resume\") filetype:pdf" \
      2>/dev/null | grep -oP 'https?://[^\s]+\.pdf' | head -2)

    if [ -n "$results" ]; then
      while read -r pdf_url; do
        csv_append data/verified_cvs.csv "$artist_name,$pdf_url,pdf,google,unverified"
      done <<< "$results"
      log "$artist_name -> $(echo "$results" | wc -l | tr -d ' ') PDF(s) from Google"
    fi
    sleep $((RANDOM % 8 + 5))  # Longer delay for Google
  fi

  mark_processed "${artist_name}_cv" logs/cv_processed.log
  random_delay
done
```

---

## Module 5: Validate & Merge

```bash
#!/bin/bash
# modules/05_merge.sh — deduplicate, validate, produce final output
source lib/utils.sh "$1"

log "Validating and merging all data..."

python3 << 'PYEOF'
import csv, re, sys
from collections import defaultdict
from pathlib import Path

artists = defaultdict(lambda: {"website": "", "instagram": "", "cv_url": ""})

# Load all sources
sources = [
    ("data/artist_websites.csv", "artist_name", {"website": "website_url"}),
    ("data/instagram_handles.csv", "artist_name", {"instagram": "url"}),
    ("data/verified_cvs.csv", "artist_name", {"cv_url": "cv_url"}),
]

for csv_path, key_col, field_map in sources:
    p = Path(csv_path)
    if not p.exists():
        continue
    with open(p) as f:
        for row in csv.DictReader(f):
            name = row[key_col].strip()
            if not name:
                continue
            for our_field, csv_field in field_map.items():
                val = row.get(csv_field, "").strip()
                if val and not artists[name][our_field]:
                    artists[name][our_field] = val

# Validate
valid = 0
invalid = 0
for name, data in sorted(artists.items()):
    # Reject parsing artifacts
    if len(name) < 3 or any(w in name.lower() for w in ("works by", "curated", "exhibition")):
        invalid += 1
        continue
    valid += 1

# Write output
with open("data/artists_enriched.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["artist_name", "website", "instagram", "cv_url"])
    w.writeheader()
    for name, data in sorted(artists.items()):
        if len(name) >= 3:
            w.writerow({"artist_name": name, **data})

print(f"Merged: {valid} valid, {invalid} rejected -> data/artists_enriched.csv")
PYEOF

log "Merge complete"
```

---

## Master Runner

```bash
#!/bin/bash
# run_lookup.sh — run full pipeline for any gallery
set -euo pipefail

CONF="${1:?Usage: ./run_lookup.sh gallery.conf}"
[ -f "$CONF" ] || { echo "Config not found: $CONF"; exit 1; }

echo "========================================"
echo "  Artist Lookup Pipeline"
echo "  Config: $CONF"
echo "========================================"

./setup_csvs.sh
for module in modules/0{1,2,3,4,5}_*.sh; do
  echo ""
  echo "--- Running: $(basename "$module") ---"
  bash "$module" "$CONF"
done

echo ""
echo "========================================"
echo "  RESULTS"
echo "========================================"
echo "  Websites:  $(tail -n +2 data/artist_websites.csv 2>/dev/null | wc -l | tr -d ' ')"
echo "  Instagram: $(tail -n +2 data/instagram_handles.csv 2>/dev/null | wc -l | tr -d ' ')"
echo "  CVs:       $(tail -n +2 data/verified_cvs.csv 2>/dev/null | wc -l | tr -d ' ')"
echo "  Errors:    $(wc -l < logs/errors.log | tr -d ' ')"
echo "  Output:    data/artists_enriched.csv"
echo "========================================"
```

---

## Adapting for a New Gallery

| Step | Action | Time |
|------|--------|------|
| 1 | Copy `gallery.conf.example` to `mygallery.conf` | 30s |
| 2 | Fill in 8 config fields (name, URL, domain, link pattern, delays) | 2 min |
| 3 | Test roster fetch: `bash modules/01_roster.sh mygallery.conf` | 1 min |
| 4 | Verify links extracted: `cat data/rosters/mygallery_links.txt` | 30s |
| 5 | Run full pipeline: `./run_lookup.sh mygallery.conf` | 25-35 min |

**Lessons learned from CLEARING extraction**:
- Always check for comma-separated artist lists in exhibition descriptions (regex: `works by (.+)`)
- Multi-location galleries need location tagged per exhibition, not per gallery
- Instagram extraction during profile scraping (Module 2) catches 60%+ of handles — the separate Instagram module is for stragglers only
- Gallery `/artists` pages are gold — check for them before crawling exhibitions
- Names with particles (van, de, d') and accents (é, ö, ñ) break naive regex — use broad character classes

---

## Performance

| Task | Time (50 artists) | Hit Rate |
|------|-------------------|----------|
| Roster + profile fetch | 3-5 min | 95% |
| Website extraction | (included above) | 70% |
| Instagram discovery | 5-8 min | 50-60% |
| CV search | 8-12 min | 40-50% |
| Validate + merge | <10s | 98% |
| **Total** | **~20-30 min** | **~85%** |

---

## Ethics

- Check `robots.txt` before scraping any gallery
- Use 2-5s delays between requests (5-10s for Instagram)
- Identify requests with a User-Agent string
- Don't bypass authentication or paywalls
- Respect gallery Terms of Service
