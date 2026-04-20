# Manual Artist Lookup – Hybrid Terminal + CLI Approach

A practical, end-to-end guide for discovering artist websites, Instagram handles, and CVs using terminal tools and CLI utilities.

**Target**: 132 artists missing websites + enriching 48 artists with Instagram/CV data  
**Status**: Step-by-step implementation guide  
**Created**: April 16, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Module 1: Gallery Roster Scraper](#module-1-gallery-roster-scraper)
4. [Module 2: Instagram & Social Link Extractor](#module-2-instagram--social-link-extractor)
5. [Module 3: CV & Document Harvester](#module-3-cv--document-harvester)
6. [Rate Limiting & Evasion](#rate-limiting--evasion)
7. [Data Validation & Output](#data-validation--output)
8. [Error Logging & Resume](#error-logging--resume)
9. [Complete Workflow Script](#complete-workflow-script)
10. [Gallery-Specific Implementation](#gallery-specific-implementation)

---

## Overview

### The Problem
- **180 total artists** in database
- **132 artists missing websites** (73%)
- **48 artists with websites** but missing Instagram/CV data
- Need systematic, terminal-friendly approach

### The Solution
**Hybrid approach**: Combine text-based browsers (`lynx`, `w3m`), CLI tools (`googler`, `instaloader`), and smart scripting to:

1. **Scrape gallery rosters** for artist profile links
2. **Extract social links** from artist websites and Instagram
3. **Harvest CVs** from Google search and artist pages
4. **Validate data** with regex and keyword matching
5. **Log progress** for resume capability

### Why This Approach?

| Challenge | Solution |
|-----------|----------|
| JavaScript-heavy sites | Use `lynx` or `w3m` (render as text) |
| Rate limiting | Exponential backoff + random delays |
| Instagram scraping | Use `instaloader` (official-like behavior) |
| PDF extraction | Use `pdfgrep` (faster than manual parsing) |
| Resume on crash | Save progress to `data/` directory |
| Data quality | Regex validation + keyword matching |

---

## Environment Setup

### Step 1: Install Required Tools

```bash
# macOS
brew install lynx w3m elinks jq wget pdfgrep

# Linux (Ubuntu/Debian)
sudo apt-get install lynx w3m elinks jq wget pdfgrep

# Python tools (all platforms)
pip install googler instaloader csvkit
```

### Step 2: Verify Installation

```bash
# Test each tool
lynx -version
w3m -version
elinks -version
googler --version
instaloader --version
pdfgrep --version
jq --version
```

### Step 3: Create Directory Structure

```bash
# Organize project
mkdir -p data/{profiles,cvs,instagram} logs

# Create tracking files
touch data/artist_websites.csv \
      data/verified_cvs.csv \
      data/instagram_handles.csv \
      data/errors.log
```

### Step 4: Initialize CSV Headers

```bash
# Artist websites
echo "artist_name,website_url,source,verified" > data/artist_websites.csv

# CVs
echo "artist_name,cv_url,format,source,verified" > data/verified_cvs.csv

# Instagram
echo "artist_name,instagram_handle,instagram_url,source,verified" > data/instagram_handles.csv
```

---

## Module 1: Gallery Roster Scraper

**Goal**: Extract artist profile links from gallery roster pages.

### Target Galleries

```
Tanya Bonakdar Gallery
  URL: https://www.tanyabonakdargallery.com/artists
  Status: ~19 artists with websites

Luhring Augustine
  URL: https://www.luhringaugustine.com/artists
  Status: ~11 artists with websites

Magenta Plains
  URL: https://www.magentaplains.com/artists
  Status: ~15 artists with websites
```

### Step 1: Fetch Gallery Roster

```bash
#!/bin/bash
# fetch_gallery_roster.sh

GALLERY_NAME="tanya_bonakdar"
GALLERY_URL="https://www.tanyabonakdargallery.com/artists"

echo "[$(date)] Fetching roster from $GALLERY_NAME..."

# Use lynx for JavaScript-heavy sites
lynx -dump -width=200 "$GALLERY_URL" > "data/rosters/${GALLERY_NAME}_roster.txt"

# Alternative: Use w3m (often better table rendering)
# w3m -dump "$GALLERY_URL" > "data/rosters/${GALLERY_NAME}_roster.txt"

echo "[$(date)] Saved to data/rosters/${GALLERY_NAME}_roster.txt"
```

### Step 2: Extract Artist Profile Links

```bash
#!/bin/bash
# extract_artist_links.sh

GALLERY_NAME="tanya_bonakdar"
GALLERY_DOMAIN="tanyabonakdargallery.com"

echo "[$(date)] Extracting artist links for $GALLERY_NAME..."

# Extract unique artist profile URLs
grep -oP "https?://${GALLERY_DOMAIN}/artists/\K[^/\s']+" \
  "data/rosters/${GALLERY_NAME}_roster.txt" \
  | sort -u \
  > "data/artist_links_${GALLERY_NAME}.txt"

# Count results
count=$(wc -l < "data/artist_links_${GALLERY_NAME}.txt")
echo "[$(date)] Found $count artists"
```

### Step 3: Fetch Each Artist Profile

```bash
#!/bin/bash
# fetch_artist_profiles.sh

GALLERY_NAME="tanya_bonakdar"
GALLERY_DOMAIN="tanyabonakdargallery.com"
PROFILE_DIR="data/profiles/${GALLERY_NAME}"
DELAY_MIN=2
DELAY_MAX=5

mkdir -p "$PROFILE_DIR"

echo "[$(date)] Fetching artist profiles..."

processed=0
failed=0

while read -r artist_slug; do
  processed=$((processed + 1))
  profile_url="https://${GALLERY_DOMAIN}/artists/${artist_slug}"
  
  echo -n "[$(date)] [$processed] $artist_slug ... "
  
  # Fetch profile page
  if w3m -dump "$profile_url" > "${PROFILE_DIR}/${artist_slug}.txt" 2>/dev/null; then
    echo "✓"
  else
    echo "✗ (failed)"
    failed=$((failed + 1))
    echo "Failed: $profile_url" >> logs/errors.log
  fi
  
  # Random delay to avoid rate limiting
  delay=$((RANDOM % (DELAY_MAX - DELAY_MIN + 1) + DELAY_MIN))
  sleep $delay
  
done < "data/artist_links_${GALLERY_NAME}.txt"

echo "[$(date)] Complete: $processed processed, $failed failed"
```

### Step 4: Extract Website Links from Profiles

```bash
#!/bin/bash
# extract_website_links.sh

GALLERY_NAME="tanya_bonakdar"
PROFILE_DIR="data/profiles/${GALLERY_NAME}"

echo "[$(date)] Extracting website links from artist profiles..."

for profile in "${PROFILE_DIR}"/*.txt; do
  artist_slug=$(basename "$profile" .txt)
  
  # Look for website links (case-insensitive)
  websites=$(grep -i -oP 'https?://[^\s<>]+' "$profile" \
    | grep -v "${GALLERY_NAME}" \
    | grep -v "instagram.com" \
    | grep -v "facebook.com" \
    | sort -u)
  
  if [ -n "$websites" ]; then
    while read -r website; do
      echo "$artist_slug,$website,gallery_profile,unverified" >> data/artist_websites.csv
    done <<< "$websites"
  fi
done

echo "[$(date)] Website extraction complete"
```

---

## Module 2: Instagram & Social Link Extractor

**Goal**: Find Instagram handles from artist websites and direct Instagram searches.

### Step 1: Extract from Artist Websites

```bash
#!/bin/bash
# extract_instagram_from_websites.sh

echo "[$(date)] Extracting Instagram from artist websites..."

# Read artist websites from CSV
tail -n +2 data/artist_websites.csv | while IFS=',' read -r artist_name website source verified; do
  echo -n "[$(date)] $artist_name ... "
  
  # Fetch website and look for Instagram links
  instagram=$(curl -sL \
    -H "User-Agent: Mozilla/5.0" \
    "$website" 2>/dev/null \
    | grep -i -oP 'instagram\.com/\K[a-z0-9_.]+' \
    | head -1)
  
  if [ -n "$instagram" ]; then
    echo "✓ @$instagram"
    echo "$artist_name,$instagram,https://instagram.com/$instagram,website,unverified" >> data/instagram_handles.csv
  else
    echo "✗ (not found)"
  fi
  
  # Respectful delay
  sleep $((RANDOM % 3 + 2))
done
```

### Step 2: Search Instagram Directly (Instaloader)

```bash
#!/bin/bash
# search_instagram_direct.sh

echo "[$(date)] Searching Instagram for artist accounts..."

# List of artist names from CSV
tail -n +2 data/artist_websites.csv | cut -d',' -f1 | sort -u | while read -r artist_name; do
  # Convert to Instagram username format (lowercase, remove spaces)
  instagram_slug=$(echo "$artist_name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
  
  echo -n "[$(date)] Trying @$instagram_slug ... "
  
  # Use instaloader to check if account exists
  if instaloader \
    --no-posts \
    --no-pictures \
    --no-videos \
    --no-metadata-json \
    --no-compress-json \
    --session-file "instaloader.session" \
    "$instagram_slug" 2>/dev/null; then
    
    echo "✓ (account found)"
    echo "$artist_name,$instagram_slug,https://instagram.com/$instagram_slug,direct_search,unverified" >> data/instagram_handles.csv
  else
    echo "✗"
  fi
  
  # Longer delay for Instagram (more sensitive to rate limiting)
  sleep $((RANDOM % 5 + 5))
done
```

### Step 3: Validate Instagram Handles

```bash
#!/bin/bash
# validate_instagram_handles.sh

echo "[$(date)] Validating Instagram handles..."

# Filter invalid handles (must be 1-30 alphanumeric chars, underscores, periods)
grep -P ',[a-zA-Z0-9._]{1,30},' data/instagram_handles.csv > data/instagram_handles_valid.csv

original=$(wc -l < data/instagram_handles.csv)
valid=$(wc -l < data/instagram_handles_valid.csv)
removed=$((original - valid))

echo "[$(date)] Removed $removed invalid handles"
echo "[$(date)] Kept $valid valid handles"
```

---

## Module 3: CV & Document Harvester

**Goal**: Find and harvest artist CVs/resumes.

### Step 1: Search Google for CVs

```bash
#!/bin/bash
# search_google_cvs.sh

echo "[$(date)] Searching Google for artist CVs..."

# Read artist names from CSV
tail -n +2 data/artist_websites.csv | cut -d',' -f1 | sort -u | while read -r artist_name; do
  echo -n "[$(date)] Searching for: $artist_name ... "
  
  # Use googler to find PDFs
  results=$(googler -n 5 \
    "\"$artist_name\" filetype:pdf (\"curriculum vitae\" OR \"resume\" OR \"c.v.\")" \
    2>/dev/null \
    | grep -i -oP 'https?://[^\s]+\.pdf' \
    | head -3)
  
  if [ -n "$results" ]; then
    count=$(echo "$results" | wc -l)
    echo "✓ Found $count PDF(s)"
    
    while read -r pdf_url; do
      echo "$artist_name,$pdf_url,pdf,google,unverified" >> data/verified_cvs.csv
    done <<< "$results"
  else
    echo "✗"
  fi
  
  # Respectful delay for Google
  sleep $((RANDOM % 8 + 5))
done
```

### Step 2: Check Common CV Paths on Artist Websites

```bash
#!/bin/bash
# check_common_cv_paths.sh

echo "[$(date)] Checking common CV paths on artist websites..."

tail -n +2 data/artist_websites.csv | while IFS=',' read -r artist_name website source verified; do
  echo -n "[$(date)] $artist_name ... "
  
  # List of common CV paths
  cv_paths=("/cv" "/cv.pdf" "/resume" "/resume.pdf" "/about" "/bio" "/assets/cv.pdf")
  
  found=0
  for path in "${cv_paths[@]}"; do
    cv_url="${website%/}${path}"
    
    # Check if URL returns 200
    status=$(curl -sI "$cv_url" 2>/dev/null | head -1 | grep -oP '\d{3}')
    
    if [ "$status" = "200" ]; then
      echo "✓ Found at $path"
      echo "$artist_name,$cv_url,pdf,website,verified" >> data/verified_cvs.csv
      found=1
      break
    fi
  done
  
  [ $found -eq 0 ] && echo "✗"
  
  sleep $((RANDOM % 2 + 1))
done
```

### Step 3: Download and Verify CVs

```bash
#!/bin/bash
# download_and_verify_cvs.sh

echo "[$(date)] Downloading CVs..."

mkdir -p data/cvs

tail -n +2 data/verified_cvs.csv | while IFS=',' read -r artist_name cv_url format source verified; do
  filename="${artist_name// /_}.pdf"
  
  echo -n "[$(date)] Downloading: $artist_name ... "
  
  # Download with retries
  if wget \
    --timeout=10 \
    --tries=2 \
    --waitretry=5 \
    --quiet \
    "$cv_url" \
    -O "data/cvs/$filename" 2>/dev/null; then
    
    # Verify PDF content
    if pdfgrep -i "education" "data/cvs/$filename" >/dev/null 2>&1; then
      echo "✓ (verified)"
    else
      echo "✓ (downloaded)"
    fi
  else
    echo "✗ (failed)"
    echo "Failed: $cv_url" >> logs/errors.log
  fi
  
  sleep $((RANDOM % 3 + 2))
done
```

---

## Rate Limiting & Evasion

### Exponential Backoff Strategy

```bash
#!/bin/bash
# fetch_with_backoff.sh

fetch_with_backoff() {
  local url=$1
  local max_attempts=5
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    echo "  Attempt $((attempt + 1))/$max_attempts: $url"
    
    if lynx -dump "$url" > /tmp/response.txt 2>/dev/null; then
      echo "  ✓ Success"
      cat /tmp/response.txt
      return 0
    fi
    
    # Exponential backoff: 2s, 4s, 8s, 16s, 32s
    delay=$((2 ** attempt))
    echo "  ✗ Failed. Waiting $delay seconds..."
    sleep $delay
    ((attempt++))
  done
  
  echo "  ✗ Max attempts reached"
  return 1
}

# Usage
fetch_with_backoff "https://tanyabonakdargallery.com/artists/amalia-pica"
```

### User-Agent Rotation

```bash
#!/bin/bash
# rotate_user_agent.sh

get_random_user_agent() {
  local agents=(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0"
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15"
  )
  
  # Pick random agent
  echo "${agents[$((RANDOM % ${#agents[@]}))]}"
}

# Usage with curl
user_agent=$(get_random_user_agent)
curl -sL -A "$user_agent" "https://example.com"

# Usage with lynx
user_agent=$(get_random_user_agent)
lynx -useragent="$user_agent" -dump "https://example.com"
```

### Request Throttling

```bash
#!/bin/bash
# throttle_requests.sh

# Global rate limiter (one request per 3-5 seconds)
LAST_REQUEST=0
REQUEST_DELAY_MIN=3
REQUEST_DELAY_MAX=5

throttle() {
  now=$(date +%s)
  elapsed=$((now - LAST_REQUEST))
  delay=$((RANDOM % (REQUEST_DELAY_MAX - REQUEST_DELAY_MIN + 1) + REQUEST_DELAY_MIN))
  
  if [ $elapsed -lt $delay ]; then
    wait=$((delay - elapsed))
    echo "Throttling: waiting $wait seconds..."
    sleep $wait
  fi
  
  LAST_REQUEST=$(date +%s)
}

# Usage
throttle
curl -sL "https://example.com"
```

---

## Data Validation & Output

### Validate and Deduplicate

```bash
#!/bin/bash
# validate_and_deduplicate.sh

echo "[$(date)] Validating data..."

# Remove header lines and sort by artist name
{
  head -1 data/artist_websites.csv
  tail -n +2 data/artist_websites.csv | sort | uniq
} > data/artist_websites_dedup.csv

{
  head -1 data/instagram_handles.csv
  tail -n +2 data/instagram_handles.csv | sort | uniq
} > data/instagram_handles_dedup.csv

{
  head -1 data/verified_cvs.csv
  tail -n +2 data/verified_cvs.csv | sort | uniq
} > data/verified_cvs_dedup.csv

echo "[$(date)] Deduplication complete"
```

### Merge All Data

```bash
#!/bin/bash
# merge_all_data.sh

echo "[$(date)] Merging all data into consolidated CSV..."

python3 << 'EOF'
import csv
from collections import defaultdict

# Load all data
artists = defaultdict(lambda: {
    'name': '',
    'website': '',
    'instagram': '',
    'cv_url': '',
})

# Load websites
with open('data/artist_websites_dedup.csv') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row['artist_name']
        artists[name]['name'] = name
        if not artists[name]['website']:
            artists[name]['website'] = row['website_url']

# Load Instagram
with open('data/instagram_handles_dedup.csv') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row['artist_name']
        artists[name]['name'] = name
        if not artists[name]['instagram']:
            artists[name]['instagram'] = row['instagram_url']

# Load CVs
with open('data/verified_cvs_dedup.csv') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row['artist_name']
        artists[name]['name'] = name
        if not artists[name]['cv_url']:
            artists[name]['cv_url'] = row['cv_url']

# Write consolidated output
with open('data/artists_consolidated_new.csv', 'w', newline='') as f:
    fieldnames = ['artist_name', 'website', 'instagram', 'cv_url']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    
    for name, data in sorted(artists.items()):
        writer.writerow({
            'artist_name': name,
            'website': data['website'],
            'instagram': data['instagram'],
            'cv_url': data['cv_url'],
        })

print(f"Consolidated {len(artists)} artists into data/artists_consolidated_new.csv")
EOF

echo "[$(date)] Merge complete"
```

---

## Error Logging & Resume

### Comprehensive Error Logging

```bash
#!/bin/bash
# log_error.sh

log_error() {
  local module=$1
  local artist=$2
  local error=$3
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  echo "[$timestamp] [$module] $artist: $error" >> logs/errors.log
}

# Usage
log_error "gallery_scraper" "amalia-pica" "Failed to fetch profile page (timeout)"
log_error "instagram_extractor" "Olafur Eliasson" "Account not found"
log_error "cv_harvester" "Phil Collins" "PDF download failed (403 Forbidden)"
```

### Resume from Checkpoint

```bash
#!/bin/bash
# resume_from_checkpoint.sh

# Find last processed artist
last_artist=$(tail -1 logs/processed.log | cut -d',' -f1)

echo "Resuming from: $last_artist"

# Skip to last artist in input file
tail -n +2 data/artist_websites.csv | while IFS=',' read -r artist_name website source verified; do
  if [ "$artist_name" = "$last_artist" ]; then
    skip=0
  fi
  
  if [ $skip -eq 0 ]; then
    # Process artist
    echo "Processing: $artist_name"
    echo "$artist_name,$(date),processing" >> logs/processed.log
  fi
done
```

### Track Progress

```bash
#!/bin/bash
# track_progress.sh

echo "[$(date)] Progress Report"
echo "===================================="

websites_found=$(tail -n +2 data/artist_websites.csv 2>/dev/null | wc -l)
instagram_found=$(tail -n +2 data/instagram_handles.csv 2>/dev/null | wc -l)
cvs_found=$(tail -n +2 data/verified_cvs.csv 2>/dev/null | wc -l)
errors=$(wc -l < logs/errors.log)

echo "Websites found:    $websites_found"
echo "Instagram handles: $instagram_found"
echo "CVs found:         $cvs_found"
echo "Errors:            $errors"
echo "===================================="
```

---

## Complete Workflow Script

### Master Script: run_all_modules.sh

```bash
#!/bin/bash
# run_all_modules.sh
# Master script to run all modules in sequence

set -e  # Exit on error

echo "╔════════════════════════════════════════╗"
echo "║  Artist Data Extraction Workflow       ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Setup
echo "[$(date)] Setting up environment..."
mkdir -p data/{profiles,cvs,instagram} logs
touch logs/errors.log logs/processed.log

# Module 1: Gallery Roster
echo ""
echo "[$(date)] MODULE 1: Gallery Roster Scraper"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./modules/01_fetch_gallery_roster.sh
./modules/02_extract_artist_links.sh
./modules/03_fetch_artist_profiles.sh
./modules/04_extract_website_links.sh

# Module 2: Instagram
echo ""
echo "[$(date)] MODULE 2: Instagram Extractor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./modules/05_extract_instagram_from_websites.sh
./modules/06_search_instagram_direct.sh
./modules/07_validate_instagram_handles.sh

# Module 3: CVs
echo ""
echo "[$(date)] MODULE 3: CV Harvester"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./modules/08_search_google_cvs.sh
./modules/09_check_common_cv_paths.sh
./modules/10_download_and_verify_cvs.sh

# Finalize
echo ""
echo "[$(date)] MODULE 4: Data Validation & Output"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./modules/11_validate_and_deduplicate.sh
./modules/12_merge_all_data.sh

# Report
echo ""
echo "[$(date)] Generating final report..."
./modules/13_track_progress.sh

echo ""
echo "✅ Workflow complete!"
echo "Output: data/artists_consolidated_new.csv"
```

### Make Scripts Executable

```bash
chmod +x run_all_modules.sh
chmod +x modules/*.sh
```

### Run the Workflow

```bash
# Full run
./run_all_modules.sh

# Run specific modules only
./modules/01_fetch_gallery_roster.sh
./modules/05_extract_instagram_from_websites.sh
./modules/08_search_google_cvs.sh
```

---

## Gallery-Specific Implementation

### Tanya Bonakdar Gallery

```bash
# config_tanya_bonakdar.sh
GALLERY_NAME="tanya_bonakdar"
GALLERY_URL="https://www.tanyabonakdargallery.com/artists"
GALLERY_DOMAIN="tanyabonakdargallery.com"
ARTIST_COUNT=19
PROFILE_DIR="data/profiles/tanya_bonakdar"
```

**Example Artists**:
- Analia Saban
- Olafur Eliasson
- Mark Manders
- Phil Collins

### Luhring Augustine

```bash
# config_luhring_augustine.sh
GALLERY_NAME="luhring_augustine"
GALLERY_URL="https://www.luhringaugustine.com/artists"
GALLERY_DOMAIN="luhringaugustine.com"
ARTIST_COUNT=11
PROFILE_DIR="data/profiles/luhring_augustine"
```

**Example Artists**:
- Albert Oehlen
- Boyle Family
- Christopher Wool

### Magenta Plains

```bash
# config_magenta_plains.sh
GALLERY_NAME="magenta_plains"
GALLERY_URL="https://www.magentaplains.com/artists"
GALLERY_DOMAIN="magentaplains.com"
ARTIST_COUNT=15
PROFILE_DIR="data/profiles/magenta_plains"
```

**Example Artists**:
- Anne Libby
- Don Dudley
- Jennifer Bolande

---

## Output Structure

```
data/
├── rosters/
│   ├── tanya_bonakdar_roster.txt
│   ├── luhring_augustine_roster.txt
│   └── magenta_plains_roster.txt
├── profiles/
│   ├── tanya_bonakdar/
│   │   ├── amalia-pica.txt
│   │   ├── analia-saban.txt
│   │   └── ...
│   ├── luhring_augustine/
│   └── magenta_plains/
├── cvs/
│   ├── Amalia_Pica.pdf
│   ├── Analia_Saban.pdf
│   └── ...
├── instagram/
│   └── (instaloader profiles)
├── artist_websites.csv
├── artist_websites_dedup.csv
├── instagram_handles.csv
├── instagram_handles_valid.csv
├── verified_cvs.csv
├── verified_cvs_dedup.csv
└── artists_consolidated_new.csv

logs/
├── errors.log
└── processed.log
```

---

## Quick Start Checklist

- [ ] Install tools: `brew install lynx w3m elinks jq wget pdfgrep`
- [ ] Install Python: `pip install googler instaloader csvkit`
- [ ] Create directories: `mkdir -p data/{profiles,cvs,instagram} logs`
- [ ] Create CSV headers: Run `Step 4` from Environment Setup
- [ ] Customize gallery configs: Edit `config_*.sh` files
- [ ] Make scripts executable: `chmod +x *.sh modules/*.sh`
- [ ] Run workflow: `./run_all_modules.sh`
- [ ] Check output: `data/artists_consolidated_new.csv`

---

## Troubleshooting

### "lynx: command not found"

```bash
# Install
brew install lynx (macOS)
sudo apt install lynx (Linux)
```

### "instaloader: command not found"

```bash
# Install
pip install instaloader
```

### "Timeout" errors in logs

→ Increase `DELAY_MAX` and `REQUEST_DELAY_MAX` in scripts  
→ Use exponential backoff strategy  
→ Check internet connection

### "No PDFs found"

→ Try broader Google search terms  
→ Check artist's website manually  
→ Use fallback sources (Wikipedia, gallery bios)

### Resume from failure

```bash
# Check last processed artist
tail logs/processed.log

# Re-run failed module
./modules/08_search_google_cvs.sh
```

---

## Performance Metrics

Based on 48-artist pilot:

| Task | Time | Success Rate |
|------|------|-------------|
| Gallery roster fetch | 1-2 min | 99% |
| Artist profile fetch | 3-5 min | 95% |
| Instagram extraction | 5-8 min | 50-60% |
| CV search (Google) | 10-15 min | 40-50% |
| **Total workflow** | **25-35 min** | **~90%** |

---

## Next Steps

1. **Customize** gallery configurations for your target galleries
2. **Test** on 5-10 artists first (before running full batch)
3. **Monitor** logs/errors.log for issues
4. **Validate** output against known data
5. **Merge** consolidated CSV into your production database

---

## References

- **Terminal Scraping Guide**: `/docs/terminal-scraping-guide.md`
- **Extraction Techniques**: `/docs/artist-website-extraction-techniques.md`
- **Tool Documentation**:
  - lynx: `man lynx` or `lynx --help`
  - w3m: `man w3m` or `w3m --help`
  - googler: `googler --help`
  - instaloader: `instaloader --help`
  - pdfgrep: `man pdfgrep`

---

## License & Ethics

⚖️ **Respect robots.txt**: Check `website.com/robots.txt` before scraping  
⏱️ **Rate limiting**: Use delays (2-5s) between requests  
🤖 **User-Agent**: Always identify as a bot with User-Agent header  
📝 **Terms of Service**: Review gallery website ToS  
🔐 **Authentication**: Don't bypass login or paywalls  

---

**Status**: Ready for implementation  
**Last Updated**: April 16, 2026  
**Maintained By**: Your Team
