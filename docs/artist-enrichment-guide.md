# Artist Data Enrichment Quick Guide

**Status**: ✅ Complete  
**Last Updated**: April 15, 2026  
**Coverage**: 48 artists with websites (26% of database)

---

## What Was Done

Using terminal-based web scraping techniques from `/docs/terminal-scraping-guide.md`, we enriched artist data by extracting:

- **Instagram Profiles** → 24 artists (50% coverage of website artists)
- **CV/Resume URLs** → 43 artists (89% coverage of website artists)

---

## Results at a Glance

| Metric | Value |
|--------|-------|
| Artists with websites | 48 |
| Artists with Instagram | 24 |
| Artists with CV URLs | 43 |
| Instagram coverage | 50% |
| CV coverage | 89% |

---

## How to Use the Data

### In Your App

Access enriched artist data from `/data/artists-consolidated.csv`:

```csv
id,name,slug,nationality,birth_year,website,instagram,galleries_exhibited,cv_url
,Alex Kwartler,,,,https://alexkwartler.com,https://www.instagram.com/albert_cortzbar,Magenta Plains,https://alexkwartler.com/cv
,Analia Saban,,,,https://analiasabanstudio.com,https://www.instagram.com/askunst/?hl=en,"Gemini G.E.L., Tanya Bonakdar Gallery, ...",https://analiasabanstudio.com/cv
```

### New Columns

- **cv_url**: Direct link to artist's CV/Resume (usually PDF)
  - Useful for: Exhibition history, education, collections
  - Format: Full URL ready to fetch or embed in iframe

- **instagram**: Updated with 24 artist profiles
  - Useful for: Social media integration, latest artwork posts
  - Format: Standard Instagram URL

---

## Script Reference

### Extract Instagram & CV from Artist Websites

```bash
python3 scripts/extract-social-and-cv.py
```

**What it does:**
- Fetches each artist's website
- Searches for Instagram handles (regex pattern matching)
- Searches for CV/Resume PDFs
- Saves results to `/data/artist-enrichment.json`

**Time**: ~50 seconds for all 48 artists  
**Output**: `artist-enrichment.json` with Instagram & CV URLs

### Merge Enrichment Data into CSV

```bash
python3 scripts/merge-enrichment-to-csv.py
```

**What it does:**
- Reads enrichment data from JSON
- Updates CSV with Instagram & CV columns
- Adds `cv_url` column if missing
- Saves updated `/data/artists-consolidated.csv`

---

## Examples of Enriched Artists

### With Both Instagram & CV
- **Analia Saban**: analiasabanstudio.com → instagram + CV
- **Olafur Eliasson**: olafureliasson.net → instagram + CV  
- **Kimsooja**: kimsooja.com → instagram + CV
- **Phil Collins**: philcollins.com → instagram + CV

### With CV Only (No Personal Instagram)
- **Bill Saylor**: billsaylor.com → CV only
- **Carla Klein**: carlaklein.studio → CV only
- **Dirk Stewen**: dirkstewen.com → CV only

### Gallery-Shared Instagram
Some Magenta Plains artists share: @magentaplains
- Anne Libby, Don Dudley, Ebecho Muslimova, etc.

---

## How It Works (Technical)

### Tools Used
- **curl**: HTTP requests with browser headers (avoid 403 blocks)
- **Python regex**: Pattern matching for Instagram handles & PDF links
- **CSV processing**: Merge enrichment back into database

### Patterns Matched

**Instagram**:
```regex
https?://(?:www\.)?instagram\.com/[a-zA-Z0-9_.]+/?
```

**CV/Resume**:
- Direct PDF patterns: `*cv*.pdf`, `*resume*.pdf`
- Common paths: `/cv`, `/cv.pdf`, `/resume`, `/resume.pdf`
- Nested: `/assets/cv.pdf`, `/wp-content/uploads/...-cv.pdf`

### Respectful Scraping
- 0.3s delay between requests
- Browser User-Agent header
- 15s timeout per request
- Graceful error handling

---

## Next Steps

### Validation (Recommended)
1. **Test CV URLs**
   ```bash
   # Sample test
   curl -sI https://alexkwartler.com/cv | grep HTTP
   ```

2. **Verify Instagram links**
   - Check that accounts are public & current
   - Confirm artist profiles (not just fan pages)

### Data Enhancement (Optional)
1. **Extract artist bio** from website `/about` or `/bio`
2. **Parse CV for exhibitions**
   - Solo exhibitions, group shows, collections
   - Using PDF extraction tools: `pdftotext`

3. **Add more social platforms**
   - Twitter/X, TikTok, LinkedIn, Threads
   - Gallery mentions on other sites

### Fill Missing Data (Optional)
1. **Find Instagram for 24 artists without**
   - Manual search or gallery website links
   - Follow up with gallery if unavailable

2. **Website discovery for 132 artists without websites**
   - Using gallery rosters or portfolio sites
   - See `/scripts/manual-artist-lookup.md` for approach

---

## File Reference

| File | Purpose |
|------|---------|
| `/data/artists-consolidated.csv` | Main enriched dataset (48 artists with websites) |
| `/data/artist-enrichment.json` | Raw enrichment data (Instagram + CV URLs) |
| `/scripts/extract-social-and-cv.py` | Scraping script |
| `/scripts/merge-enrichment-to-csv.py` | CSV merge utility |
| `/docs/terminal-scraping-guide.md` | Original scraping reference guide |
| `/docs/enrichment-completion-report.md` | Detailed completion report |
| `/scripts/manual-artist-lookup.md` | Manual lookup reference |

---

## Troubleshooting

### "Site returned no content"
- Website may block terminal requests
- Try adding different User-Agent headers
- Check if site requires authentication

### "CV URL returns 404"
- Site structure may have changed since scraping
- Try `/assets/cv.pdf` or `/downloads/cv.pdf`
- Check website manually for correct CV path

### "Instagram pattern not found"
- Artist may not link Instagram on website
- Might be on gallery roster instead
- Check website `/about` or `/contact` pages

---

## Resources

- **Terminal Scraping Guide**: `/docs/terminal-scraping-guide.md`
- **Complete Report**: `/docs/enrichment-completion-report.md`
- **Sample Artists**: See CSV with 24 Instagram + 43 CV examples
