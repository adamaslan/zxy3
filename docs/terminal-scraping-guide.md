# Terminal-Only Web Scraping Guide

A reference for scraping artist/gallery data using only terminal tools — no browser required.

---

## Tool Overview

| Tool | Best For | Install |
|------|----------|---------|
| `curl` | Raw HTTP fetch, follows redirects | pre-installed |
| `wget` | Mirror/recursive download | `brew install wget` |
| `lynx` | Render page as plain text + numbered links | `brew install lynx` |
| `w3m` | Like lynx, handles tables better | `brew install w3m` |
| `pup` | CSS selector queries on HTML | `brew install pup` |
| `htmlq` | Like jq but for HTML | `brew install htmlq` |
| `jq` | Parse/filter JSON | `brew install jq` |
| `xmllint` | XPath queries on HTML | pre-installed on macOS |
| `pdftotext` | Extract text from PDFs | `brew install poppler` |
| `pdfgrep` | grep inside PDFs | `brew install pdfgrep` |
| `csvkit` | CSV manipulation suite | `pip install csvkit` |
| `miller` | CSV/JSON/TSV wrangling | `brew install miller` |

---

## Step 1: Probe the Site Structure

Before fetching content, understand what you're dealing with.

### Check headers and redirects
```bash
curl -sI "https://example.com" | head -20
```

### Follow redirects verbosely
```bash
curl -vL "https://example.com" 2>&1 | grep -E "^[<>] |Location:|HTTP/"
```

### Extract all links from a page
```bash
curl -sL "https://example.com" | grep -oP 'href="[^"]*"' | sort -u
```

### Use pup for targeted link extraction
```bash
curl -sL "https://example.com" | pup 'a attr{href}'
```

### Check if the page is JS-rendered (SPA)
```bash
curl -sL "https://example.com" | wc -c   # very small = probably SPA
curl -sL "https://example.com" | grep -c "<script src"  # many scripts = SPA
```

---

## Step 2: Fetch Page Content

### Simplest fetch — save to file
```bash
curl -sL "https://example.com" -o data/page.html
```

### Render as readable plain text (lynx)
```bash
lynx -dump "https://example.com" > data/page.txt
# Links appear numbered at bottom: [1] https://...
```

### Render with w3m (better table handling)
```bash
w3m -dump "https://example.com" > data/page.txt
```

### Strip HTML tags manually (sed/awk)
```bash
curl -sL "https://example.com" \
  | sed 's/<[^>]*>//g' \
  | awk '{$1=$1;print}' \
  | grep -v '^$' \
  > data/page.txt
```

### Try subpaths if homepage is sparse
```bash
for path in /cv /artists /about /info; do
  echo "=== $path ===" && curl -sL "https://example.com$path" | lynx -dump -stdin | head -30
done
```

---

## Step 3: Extract Structured Data

### CSS selector extraction with pup
```bash
# All heading text
curl -sL "https://example.com" | pup 'h1, h2, h3 text{}'

# All links with text
curl -sL "https://example.com" | pup 'a json{}' | jq '.[] | {text: .text, href: .href}'

# Specific class
curl -sL "https://example.com" | pup '.artist-name text{}'
```

### XPath with xmllint
```bash
curl -sL "https://example.com" | xmllint --html --xpath '//a/@href' - 2>/dev/null
curl -sL "https://example.com" | xmllint --html --xpath '//h2/text()' - 2>/dev/null
```

### Extract embedded JSON (ld+json schema)
```bash
curl -sL "https://example.com" \
  | grep -oP '(?<=<script type="application/ld\+json">)[^<]+' \
  | jq .
```

### Find API endpoints in page source
```bash
curl -sL "https://example.com" | grep -oP '(https?://[^\s"<>]+/(api|graphql|v[0-9])[^\s"<>]*)' | sort -u
```

---

## Step 4: Handle JS-Heavy / SPA Sites

### Strategy A — inspect the JS bundle for embedded data
```bash
# Find JS bundle URLs
curl -sL "https://example.com" | grep -oP 'src="([^"]+\.js)"' | sed 's/src="//;s/"//'

# Fetch bundle and search for data patterns
curl -sL "https://example.com/bundle.js" | python3 -c "
import sys, re
js = sys.stdin.read()
for match in re.finditer(r'\{\"name\":\"[^}]+\}', js):
    print(match.group()[:300])
"
```

### Strategy B — find and call the API directly
```bash
# Look for API calls in the source
curl -sL "https://example.com" | grep -oP '"(https?://[^"]+)"' | grep -i api | sort -u

# Call the API endpoint directly
curl -sL -H "Accept: application/json" "https://api.example.com/artists" | jq .
```

### Strategy C — extract from embedded JSON in script tags (Cargo CMS, Squarespace, etc.)
```bash
curl -sL "https://example.com/artists" | python3 -c "
import sys, re
html = sys.stdin.read()
names = re.findall(r'\"excerpt\":\"([^\"]+)\"', html)
for n in names:
    print(n[:200])
"
```

### Strategy D — request JSON directly
```bash
# Some sites return JSON if you set the Accept header
curl -sL -H "Accept: application/json" "https://example.com/page"

# Or try common JSON endpoints
curl -sL "https://example.com/api/data.json"
curl -sL "https://example.com/data.json"
```

---

## Step 5: Handle PDFs (CV documents)

### Convert PDF to text
```bash
# Using poppler (best quality)
pdftotext data/cv.pdf - > data/cv.txt

# Preserve layout/columns
pdftotext -layout data/cv.pdf - > data/cv.txt

# Using mupdf
mutool draw -F text data/cv.pdf > data/cv.txt
```

### Grep inside PDF without converting
```bash
pdfgrep -i "solo exhibition" data/cv.pdf
pdfgrep -i "collection" data/cv.pdf
```

### Parse CV sections with Python
```bash
python3 -c "
import re
with open('data/cv.txt') as f:
    text = f.read()
sections = re.split(r'(?m)^(SOLO EXHIBITIONS|GROUP EXHIBITIONS|COLLECTIONS|EDUCATION|BIBLIOGRAPHY)', text, flags=re.IGNORECASE)
for i in range(1, len(sections), 2):
    print(f'\n=== {sections[i]} ===')
    print(sections[i+1][:800].strip())
"
```

---

## Step 6: Build / Append CSV

### Append a single artist row
```bash
echo 'Gallery Name,Artist Full Name,https://artist-site.com' >> data/artists.csv
```

### Append multiple rows from a list
```bash
python3 -c "
import csv
rows = [
    ('Gallery A', 'Artist One', 'https://artistone.com'),
    ('Gallery A', 'Artist Two', ''),
]
with open('data/artists.csv', 'a', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(rows)
"
```

### Create a structured JSON enrichment file
```bash
python3 -c "
import json
data = {
    'artist': 'Artist Name',
    'website': 'https://artist-site.com',
    'instagram': 'https://instagram.com/handle',
    'cv_source': 'https://artist-site.com/cv',
    'solo_exhibitions': [],
    'group_exhibitions': [],
    'collections': [],
    'education': []
}
with open('data/artist-enrichment.json', 'w') as f:
    json.dump(data, f, indent=2)
print('Wrote enrichment file')
"
```

---

## Step 7: Verify

### Check CSV row count and breakdown
```bash
tail -n +2 data/artists.csv | grep -v '^$' | cut -d',' -f1 | sort | uniq -c | sort -rn
```

### Confirm specific entry exists
```bash
grep -i "artist name" data/artists.csv
```

### Validate JSON
```bash
cat data/artist-enrichment.json | python3 -m json.tool
```

### Count lines in extracted text
```bash
wc -l data/cv.txt
```

---

## Troubleshooting

### 503 / 403 errors

The server is blocking the request. Try:

```bash
# Add a User-Agent header to mimic a browser
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "https://example.com"

# Add a Referer header
curl -sL -H "Referer: https://google.com" "https://example.com"

# Add common browser headers
curl -sL \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  -H "Accept: text/html,application/xhtml+xml" \
  -H "Accept-Language: en-US,en;q=0.9" \
  "https://example.com"
```

### Page returns almost no content (SPA)

The page is rendered by JavaScript at runtime — curl only gets the shell HTML. Options:

1. Find the API endpoint (Step 4, Strategy B)
2. Search the JS bundle for embedded data (Step 4, Strategy A)
3. Check for a `sitemap.xml` that lists content URLs:
   ```bash
   curl -sL "https://example.com/sitemap.xml" | grep -oP '<loc>[^<]+</loc>'
   ```

### PDF download fails or returns HTML

The PDF may be behind auth or require a session cookie. Try:
```bash
# Check what you're actually getting
curl -sIL "https://example.com/cv.pdf" | grep -E "Content-Type|Location"
```

If `Content-Type: text/html`, the URL redirects to a login page — the file isn't publicly accessible.

### `pup` / `htmlq` returns nothing

The element might not exist or use a different selector. Debug with:
```bash
# Dump full pup structure
curl -sL "https://example.com" | pup --color

# Try broader selectors first
curl -sL "https://example.com" | pup 'div text{}'
curl -sL "https://example.com" | pup 'p text{}'
```

### `xmllint` XPath errors

Add `2>/dev/null` to suppress parse warnings, and make sure the expression is valid:
```bash
curl -sL "https://example.com" | xmllint --html --xpath '//a/text()' - 2>/dev/null
```

### `jq` parse errors on embedded JSON

The JSON may be malformed or concatenated. Use Python instead:
```bash
python3 -c "
import sys, json, re
html = sys.stdin.read()
# Find JSON-like blobs
for m in re.finditer(r'\{[^{}]{20,}\}', html):
    try:
        obj = json.loads(m.group())
        print(json.dumps(obj, indent=2)[:500])
    except:
        pass
" < data/page.html
```

### `pdftotext` not installed

```bash
brew install poppler     # installs pdftotext, pdfgrep, pdfinfo
```

Alternative with Python (no external tools):
```bash
pip install pypdf2
python3 -c "
import PyPDF2
with open('data/cv.pdf', 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    for page in reader.pages:
        print(page.extract_text())
"
```

### CV page is image-based (portfolio gallery) with no extractable text

**Problem:** The CV page renders as an image gallery instead of text content — common on portfolio sites like Adobe Portfolio, Cargo, or Wix.

**Why this happened:** The designer created a visual CV presentation (photos of a CV, artwork documentation, or a styled portfolio grid) rather than a searchable text-based CV.

**Solutions:**
1. **Check for alternate CV URLs** — Try `/bio`, `/about`, `/resume`, or look for a downloadable PDF link
   ```bash
   for path in /bio /about /resume /cv.pdf /assets/cv.pdf; do
     curl -sI "https://example.com$path" | grep -E "Content-Type|HTTP"
   done
   ```

2. **Extract from represented gallery's website** — If the artist has a main gallery rep, they often maintain detailed exhibition history
   ```bash
   curl -sL "https://gallery-name.com/artists/artist-name" | lynx -dump -stdin
   ```

3. **Parse structured bio/metadata instead** — Check `/bio`, `/about`, `/short-bio` pages for collections and institution listings (usually text-based)

4. **Manual inspection required** — Some portfolio sites genuinely require browser viewing. Consider using headless browser tools like `puppeteer` or `Playwright` if terminal-only won't work

### Encoding issues (garbled characters)

```bash
# Force UTF-8 output
curl -sL "https://example.com" | iconv -f ISO-8859-1 -t UTF-8 > data/page.html

# Check encoding from headers
curl -sI "https://example.com" | grep -i charset
```

---

## Quick Reference Cheatsheet

```bash
# Fetch + readable text in one shot
lynx -dump "https://example.com"

# Extract all links
curl -sL url | pup 'a attr{href}'

# Find JSON data on page
curl -sL url | grep -oP '(?<=<script type="application/ld\+json">)[^<]+'

# Strip HTML to plain text
curl -sL url | sed 's/<[^>]*>//g' | awk '{$1=$1;print}' | grep -v '^$'

# Bypass 403 with browser headers
curl -sL -A "Mozilla/5.0" url

# PDF to text
pdftotext file.pdf -

# Check if site has an API
curl -sL url | grep -oP '"https?://[^"]+/api/[^"]+"'

# Verify CSV
tail -n +2 data/artists.csv | cut -d',' -f1 | sort | uniq -c | sort -rn
```
