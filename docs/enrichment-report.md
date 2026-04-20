# Artist Data Enrichment Report

**Date:** April 15, 2026  
**Target:** Magenta Plains Gallery Artists  
**Method:** Terminal-based web scraping (curl, grep, Python)

---

## Overview

Enriched 19 Magenta Plains artists with website URLs and Instagram handles. Used a two-phase approach:

1. **Phase 1:** Scraped individual artist websites for Instagram handles and bio data
2. **Phase 2:** Added Magenta Plains gallery pages for artists without personal websites

---

## Results Summary

| Metric | Count | % of Total |
|--------|-------|-----------|
| **Total Magenta Plains Artists** | 19 | 100% |
| **With Website URLs** | 19 | 100% |
| **With Instagram Handles** | 3 | 16% |
| **With Bio Data** | 0 | 0% |

### Enrichment by Category

**Personal Websites (7 artists):**
- Alex Kwartler — https://alexkwartler.com
- Bill Saylor — https://www.billsaylor.com
- Jane Swavely — https://www.janeswavely.com
- Jennifer Bolande — https://jbolande.com
- Jibade-Khalil Huffman — https://jibadekhalilhuffman.tumblr.com
- Tiril Hasselknippe — https://tirilhasselknippe.com
- Zach Bruder — https://www.zachbruder.com

**Gallery Pages (12 artists):**
- Anne Libby — https://magentaplains.com/artists/anne-libby
- Chason Matthams — https://magentaplains.com/artists/chason-matthams
- Don Dudley — https://magentaplains.com/artists/don-dudley
- Ebecho Muslimova — https://magentaplains.com/artists/ebecho-muslimova
- Estate of Barbara Ess — https://magentaplains.com/artists/estate-of-barbara-ess
- Estate of Paul Gardere — https://magentaplains.com/artists/estate-of-paul-gardere
- Ken Lum — https://magentaplains.com/artists/ken-lum
- Liza Lacroix — https://magentaplains.com/artists/liza-lacroix
- Matt Keegan — https://magentaplains.com/artists/matt-keegan
- Peter Nagy — https://magentaplains.com/artists/peter-nagy
- Rachel Rossin — https://magentaplains.com/artists/rachel-rossin
- Stan VanDerBeek Archive — https://magentaplains.com/artists/stan-vanderbeek-archive

---

## Instagram Handles Found

| Artist | Instagram | Source |
|--------|-----------|--------|
| Alex Kwartler | https://www.instagram.com/albert_cortzbar | Personal website JSON-LD |
| Jane Swavely | http://instagram.com/janeswave | Personal website |
| Zach Bruder | https://www.instagram.com/zachbruder | Personal website |

---

## Scraping Techniques Used

### 1. JSON-LD Schema Extraction
Used `grep` to extract structured data from `<script type="application/ld+json">` tags on artist websites.

```bash
curl -sL "https://alexkwartler.com" | grep -oP '(?<=<script type="application/ld\+json">)[^<]+'
```

**Findings:** Alex Kwartler's page contained Person schema with Instagram URL in `sameAs` field.

### 2. Meta Tag Parsing
Extracted Open Graph and standard meta tags for descriptions and social media links.

```bash
curl -sL "URL" | grep -E 'meta name="description"|og:description'
```

### 3. URL Pattern Matching
Searched HTML for Instagram and other social media URLs using regex.

```bash
grep -o 'https://instagram.com/[a-zA-Z0-9._-]*' index.html
```

### 4. Gallery Page Discovery
Used Magenta Plains' artists listing page to map all represented artists to gallery URLs.

```bash
curl -sL "https://magentaplains.com/artists" | grep 'href="/artists/'
```

---

## Next Steps for Complete Enrichment

To further enrich the artist data, consider:

1. **Manual Bio Collection:** Gallery pages have "Bio" sections that are not machine-readable. Consider:
   - Using headless browser (Puppeteer/Playwright) for JavaScript-rendered bios
   - Manual review of the 12 gallery pages
   - Reaching out to gallery for artist bios

2. **Birth Year / Nationality:** These are not typically found on modern artist websites. Consider:
   - Searching art databases (Artsy, MutualArt, etc.) via their APIs
   - Cross-referencing with institutional records (museum collections, exhibition catalogs)
   - Manual research via Google Scholar, Wikipedia, auction house records

3. **Instagram Enrichment:** Only 3 handles found. Opportunities:
   - Some artists may have Instagram accounts not linked from their website
   - Check artist name searches directly on Instagram
   - Review recent exhibition pages which often mention social handles

4. **Additional Social Media:** Not yet collected:
   - Twitter / X handles
   - TikTok profiles (increasingly important for younger artists)
   - Professional networks (LinkedIn for artist-entrepreneurs)
   - Email contact information

---

## Technical Notes

### Tools Used
- `curl` — HTTP fetching with User-Agent headers
- `grep` / `grep -E` — Pattern matching and filtering
- `Python 3` — JSON parsing and CSV manipulation
- Terminal pipes — Data transformation and filtering

### Rate Limiting
- Added 1-second delays between requests to personal websites
- Added 0.5-second delays between gallery page requests
- Total runtime: ~15 seconds for all 19 artists

### Challenges & Solutions

**Issue:** Some artist websites are JavaScript-rendered SPAs
- **Solution:** Used curl to fetch server-side HTML; JSON-LD schema provided fallback data

**Issue:** Gallery artist pages don't expose individual Instagram handles in HTML
- **Solution:** Added gallery pages as website URLs instead; noted for manual follow-up

**Issue:** Meta description patterns vary widely across different website builders
- **Solution:** Tried multiple fallback patterns (og:description, schema description, etc.)

---

## Files Generated

```
/Users/adamaslan/code/zxy3/data/
├── artists-consolidated.csv          (updated with websites & Instagram)
├── artist-enrichment.json            (personal website scrape results)
├── gallery-enrichment.json           (gallery page scrape results)
└── enrichment-report.md              (this file)
```

---

## CSV Update Summary

**Before:**
- 7 artists with personal website URLs
- 0 artists with Instagram handles

**After:**
- 19 artists with website URLs (100% coverage)
  - 7 personal websites
  - 12 gallery pages
- 3 artists with Instagram handles (16% coverage)

---

## Recommendations for Ongoing Enrichment

1. **Prioritize High-Value Fields:**
   - Instagram handles (social engagement, discoverability)
   - Birth year / nationality (demographic diversity metrics)
   - Bio (SEO, search discoverability)

2. **Use Multi-Source Approach:**
   - Don't rely on single source; cross-check across gallery, personal sites, art databases
   - Validate data quality before committing to CSV

3. **Automate Validation:**
   - Ping URLs monthly to detect dead links
   - Re-validate Instagram handles (accounts can be renamed)
   - Set up alerts for gallery website changes

4. **Consider External APIs:**
   - Artsy API for exhibition history and collections
   - Instagram Business API for verified accounts
   - Google Search API for discovering additional pages

---

## Process Documentation

For reference, the scraping strategy used terminal-only tools (no browser automation) as per `terminal-scraping-guide.md`:

- ✅ Probed site structure with curl headers
- ✅ Fetched page content with curl
- ✅ Extracted structured data with grep + regex
- ✅ Parsed JSON-LD with standard JSON tools
- ✅ Built/appended CSV with Python

This approach is fully reproducible and can be automated in CI/CD pipelines if needed.
