# Manual Artist Website Lookup Guide

Based on `terminal-scraping-guide.md` - this documents the approach for systematically finding missing artist websites.

## Priority Artists (by gallery affiliation)

The artists can be grouped by gallery. Contact these galleries first as they often maintain artist roster pages:

### Tanya Bonakdar Gallery artists missing websites:
- Amalia Pica
- Ernesto Neto
- Laura Lima
- And ~40 others

**Strategy**: Visit `tanyabonakdargallery.com/artists` and extract all artist pages

### Luhring Augustine artists missing websites:
- Albert Oehlen
- Boyle Family
- And ~30 others

**Strategy**: Visit `luhringaugustine.com/artists` and extract all artist pages

### Magenta Plains artists missing websites:
- Various emerging artists

**Strategy**: Visit `magentaplains.com/artists`

## Terminal Extraction Recipes

### Method 1: Extract from Gallery Roster Pages

```bash
# Fetch Tanya Bonakdar Gallery artist roster
curl -sL "https://www.tanyabonakdargallery.com/artists" \
  | pup 'a.artist-name attr{href}' \
  | while read url; do
      curl -sL "$url" | pup '.website a attr{href}' 2>/dev/null
    done
```

### Method 2: Lynx + Manual Inspection

```bash
# Render gallery page as readable text
lynx -dump "https://www.tanyabonakdargallery.com/artists" > data/tanya-artists.txt

# Read and find artist page links
grep -i "artist" data/tanya-artists.txt | head -20
```

### Method 3: Search Individual Artist Sites

For each artist, try these patterns in order:

```bash
# Pattern 1: FirstName.com / FirstNameLastName.com
curl -sI "https://artistname.com" | grep HTTP

# Pattern 2: firstnamelastname.com (no space)
curl -sI "https://firstnamelastname.com" | grep HTTP

# Pattern 3: Check Artsy profile
curl -sL "https://www.artsy.net/search?q=Artist+Name" \
  | grep -oP '"/artist/[^"]+' | head -1
```

### Method 4: Extract from Embedded JSON

Many modern gallery sites embed artist data in JSON-LD:

```bash
curl -sL "https://tanyabonakdargallery.com/artists/some-artist" \
  | grep -oP '(?<=<script type="application/ld\+json">)[^<]+' \
  | jq '.url'
```

## Batch Processing with CSV Update

```bash
python3 << 'EOF'
import csv

# Map of artist names to discovered websites
discovered = {
    "Ada Friedman": "https://adafriedman.com",
    "Albert Oehlen": "https://albertoehlen.com",
    # ... more mappings
}

# Read, update, write
with open('data/artists-consolidated.csv', 'r') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

for row in rows:
    name = row.get('name', '')
    if name in discovered and not row.get('website'):
        row['website'] = discovered[name]

with open('data/artists-consolidated.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print("Updated CSV with discovered websites")
EOF
```

## Testing & Verification

```bash
# Count artists still missing websites
python3 << 'EOF'
import csv
with open('data/artists-consolidated.csv', 'r') as f:
    reader = csv.DictReader(f)
    missing = sum(1 for row in reader if row.get('name') and not row.get('website'))
    total = sum(1 for row in reader if row.get('name'))
print(f"Missing websites: {missing}/{total}")
EOF

# Verify format of URLs
grep "website" data/artists-consolidated.csv | grep -v "^website" | grep -v "https?://" | head
```

## Manual Lookup Resources

If automated extraction fails, use these sources:

- **Artsy**: `artsy.net/search?q=Artist+Name`
- **Wikipedia**: `wikipedia.org` search for artist page "website" section
- **Gallery rosters**: Visit gallery website and find artist page
- **Google**: `"artist name" artist site:*.com -site:facebook.com`
- **Instagram**: Many artists' Instagram has website link in bio (`linktree.com`, personal site, etc.)

## Notes

- Be respectful with requests (add delays between requests)
- Some sites may block terminal requests; add User-Agent headers
- PDF CVs and artist books often have website URLs
- Cross-check with gallery exhibition listings
