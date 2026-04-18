# Gallery CSV Enrichment Guide

**Last Updated**: April 16, 2026  
**Purpose**: Document enrichment priorities and workflows for `galleries-consolidated.csv`

---

## Current Status

**Audit Results (April 16, 2026)**:
- Total galleries: 52
- Data quality: 63.5% have issues (mostly fixed)
- Fixes applied:
  - ✅ 6 location/country count mismatches corrected
  - ✅ 8 website URL redirects updated
  - ✅ 12 unreachable websites marked as `inactive_website_unreachable`
  - ✅ 4 new columns added: `status`, `instagram`, `founded_year`, `last_verified`

---

## Priority 1: Investigate & Fix Unreachable Websites (12 galleries)

These galleries have broken or unreachable websites. **Action**: Investigate each one to determine if they're truly inactive or if the URL needs updating.

| Gallery | Current URL | Issue | Action |
|---------|-------------|-------|--------|
| 550 Gallery | https://www.550gallery.com | Server disconnect | Verify current website or mark closed |
| Alexandra Arts / ART511MAG | https://www.art511mag.com | SSL error | Verify current website |
| Felix Art Show | https://www.felixfair.com | SSL hostname mismatch | Search for correct URL |
| Galerie Manque | https://www.galeriemanque.com | DNS error | Check if gallery still exists |
| International Gallery | https://www.internationalgallery.org | 404 Not Found | Search for current website |
| Jorge Andrew Gallery | https://www.jorgeandrewgallery.com | DNS error | Verify current website |
| King's Leap | https://www.kingsleap.com | SSL hostname mismatch | Find correct website |
| Mery Gates | https://www.merygates.com | Timeout | Check if gallery still operating |
| Satellite Art Show | https://www.satelliteartshow.com | DNS error | Verify current website or status |
| Tanya Bonakdar Gallery | https://www.tanyabonakdargallery.com | DNS error | Check if gallery exists |
| The Border | https://www.theborder.nyc | DNS error | Verify current website |
| Underdonk | https://www.underdonk.info | DNS error | Search for current website |

**Workflow for each gallery**:
1. Google "[Gallery Name] New York" or similar
2. Check Artsy.net (search: artsy.net/galleries)
3. Check Instagram (search: instagram.com/@gallery_name or similar)
4. Check Google Maps for address/contact info
5. Update CSV with findings:
   - If website found: Update `website` column and mark `status: active`
   - If gallery closed: Mark `status: closed` and leave website blank
   - If website works but was unreachable in audit: Mark `status: active` and update URL

---

## Priority 2: Fill Missing Instagram Handles (All galleries)

**Column**: `instagram`  
**Source priority**:
1. Gallery website footer (usually has social media links)
2. Instagram search for gallery name
3. Artsy partner profile
4. Google Maps business listing

**Workflow**:
```bash
# For each gallery:
# 1. Visit their website and look for footer links
# 2. Check Instagram by searching @gallery_name_style
# 3. Update instagram column with handle (no @ symbol)
# 4. Set last_verified to today's date when updated
```

**Example**:
```csv
name,instagram,last_verified
David Zwirner,davidzwirner,2026-04-16
```

---

## Priority 3: Fill Missing Founded Year (Selective)

**Column**: `founded_year`  
**Source priority**:
1. Gallery "About" page
2. Artsy partner profile
3. Wikipedia or art world databases
4. Press articles/news

**Focus on**: Major galleries (multi-location, art fairs, museums)

**Workflow**:
```bash
# For each major gallery:
# 1. Visit their website → About/Contact section
# 2. Search Artsy profile (artsy.net/partner/[slug])
# 3. Google "[Gallery Name] founded" or "established"
# 4. Update founded_year column with YYYY format
```

---

## Priority 4: Verify & Update Status Field

**Column**: `status`  
**Current values**:
- `active` (52 - 12 = 40 galleries)
- `inactive_website_unreachable` (12 galleries)

**Acceptable values**:
- `active` - Gallery is operating and accepting submissions
- `inactive_website_unreachable` - Website not accessible (needs investigation)
- `closed` - Gallery has permanently closed
- `relocated` - Gallery moved but is still operating
- `on_hiatus` - Gallery temporarily closed but plans to reopen

**Workflow for unreachable websites**:
1. Investigate each unreachable gallery (see Priority 1)
2. Update status and website accordingly
3. Set `last_verified` to investigation date

---

## Priority 5: Enrich Multi-Location Galleries with Additional Data

These galleries warrant extra attention for enrichment:

| Gallery | Locations | Notes |
|---------|-----------|-------|
| Art Basel | 4 locations (global) | Major art fair |
| Carpenter's Workshop | 4 locations | Luxury gallery |
| Clearing | 3 locations (NY, LA, Brussels) | Key partner gallery |
| David Zwirner | 5 locations (global) | Major international gallery |
| Mana Contemporary | 2 locations (Jersey City, Chicago) | Non-profit |
| Tiger Strikes Asteroid | 5 locations (East Coast + LA + Greenville) | Multi-site artist collective |
| Winston Wächter | 2 locations (NY, Seattle) | Regional gallery |

**For each multi-location gallery**:
- [ ] Verify `locations` and `country` match exactly (done ✅)
- [ ] Add `instagram` handle (if main account or location-specific)
- [ ] Add `founded_year` if available
- [ ] Note any gallery headquarters location separately (future: add `hq_location` column)

---

## New Columns: Definition & Enrichment Strategy

### `status`
**Type**: Categorical (active | closed | relocated | on_hiatus | inactive_website_unreachable)  
**Purpose**: Track gallery operational status  
**Priority**: HIGH  
**Enrichment source**: Website verification + manual research

### `instagram`
**Type**: String (Instagram handle, no @ symbol)  
**Purpose**: Social media profile for finding represented artists + engagement data  
**Priority**: MEDIUM  
**Enrichment source**: Gallery website footer, Instagram search, Artsy

### `founded_year`
**Type**: Integer (YYYY format)  
**Purpose**: Gallery history context + age of program  
**Priority**: LOW  
**Enrichment source**: Gallery website About page, Artsy, Wikipedia, press

### `last_verified`
**Type**: Date (YYYY-MM-DD)  
**Purpose**: Track when data was last checked for accuracy  
**Priority**: MEDIUM  
**Enrichment source**: Set automatically when any other field is updated

---

## Future Columns to Consider

As your dataset matures, consider adding:

| Column | Type | Source | Priority |
|--------|------|--------|----------|
| `instagram_followers` | Integer | Instagram API or manual | LOW |
| `email` | String | Gallery contact page | MEDIUM |
| `phone` | String | Gallery contact page | MEDIUM |
| `represented_artist_count` | Integer | `/artists` page count | MEDIUM |
| `artsy_url` | URL | artsy.net/partner/[slug] | LOW |
| `neighborhood` | String | Google Maps geocode | MEDIUM |
| `focus` | String | Gallery about page (contemporary, photography, sculpture, etc.) | LOW |
| `primary_market` | String | Categorical (primary, secondary, both) | LOW |

---

## Implementation: Step-by-Step

### Phase 1: Fix Critical Issues (2-3 hours)
1. Run audit script to identify problems ✅
2. Apply automatic fixes (location/country, redirects) ✅
3. **TODO**: Investigate 12 unreachable websites (Priority 1)

### Phase 2: Add Social Media (4-6 hours)
4. **TODO**: Research and add Instagram handles for all 52 galleries (Priority 2)
5. Test Instagram handles are valid
6. Set `last_verified` for Instagram column

### Phase 3: Add Founding Dates (2-3 hours)
7. **TODO**: Research founded_year for major galleries (Priority 3)
8. Focus on top 20 galleries by prominence
9. Leave blank if uncertain; don't guess

### Phase 4: Verify Status (1-2 hours)
10. **TODO**: Update `status` field for all 12 unreachable galleries (Priority 1)
11. Mark truly closed galleries
12. Note relocated galleries

### Phase 5: Spot-Check & Validate (1 hour)
13. Manually verify 10-20 random rows for accuracy
14. Ensure all URLs are correctly formatted
15. Update `last_verified` dates

---

## Quick Research Workflow

Here's a fast workflow for enriching one gallery:

**Template** (copy & adapt):
```
1. Gallery: [Name]
   - Website: [URL]
   - Google search: "[Name] gallery [city] instagram"
   - Instagram found: @[handle] (followers: X.XK)
   - Founded year: [YYYY] (from: [source])
   - Status: [active|closed|etc]
   - Notes: [Any observations]
```

**Example - David Zwirner**:
```
1. Gallery: David Zwirner
   - Website: https://www.davidzwirner.com ✅
   - Instagram: @davidzwirner (1.2M followers)
   - Founded: 1993 (website About page)
   - Status: active ✅
   - Notes: Major international gallery, 5 locations, well-maintained site
```

---

## CSV Maintenance Schedule

Recommended verification frequency:

| Task | Frequency | Method |
|------|-----------|--------|
| Website reachability check | Quarterly | Run `audit_galleries.py` script |
| Update Instagram followers | Quarterly | Manual check or Instagram API |
| Verify gallery status (open/closed) | Every 6 months | Search for recent exhibitions |
| Update founded_year | Annually | Check if new historical info available |
| General spot-check | Monthly | Pick 5-10 random galleries and verify |

---

## Scripts Available

### `audit_galleries.py`
Verifies website connectivity and identifies data quality issues.
```bash
python scripts/audit_galleries.py
```

Output: Full audit report with issue categorization

### `enrich_galleries.py`
Applies automated fixes and adds new columns.
```bash
python scripts/enrich_galleries.py
```

Output: Updated CSV with fixes applied

---

## Data Quality Checklist

Before marking a gallery as "verified", check:

- [ ] Website URL is correct and loads (status 200)
- [ ] Location and country match (no semicolon mismatches)
- [ ] Gallery type is accurate (commercial, non-profit, museum, art_fair, institution)
- [ ] Instagram handle is valid and links to official gallery account
- [ ] Founded year (if present) matches official sources
- [ ] Status field reflects current operational state
- [ ] `last_verified` date is recent (within past 3 months)

---

## Example Completion: Clearing Gallery

Let's say we fully enrich "Clearing":

**Current state**:
```csv
name,slug,locations,country,type,website,status,instagram,founded_year,last_verified
Clearing,clearing,"New York; Los Angeles; Brussels","USA; USA; Belgium",commercial,https://www.c-l-e-a-r-i-n-g.com,active,,,
```

**After enrichment** (research):
```csv
name,slug,locations,country,type,website,status,instagram,founded_year,last_verified
Clearing,clearing,"New York; Los Angeles; Brussels","USA; USA; Belgium",commercial,https://www.c-l-e-a-r-i-n-g.com,active,clearingnyc,2018,2026-04-16
```

**Research steps**:
1. Visit https://www.c-l-e-a-r-i-n-g.com → Look for Instagram link (found: @clearingnyc)
2. Search website for "Founded" or "About" → Found: 2018 in press materials
3. Verify Instagram account is official and active → Confirmed
4. Double-check all locations match website → Confirmed
5. Set `last_verified` to today

---

## Next Steps

1. **This week**: Complete Priority 1 (Investigate 12 unreachable websites)
2. **Next week**: Complete Priority 2 (Add Instagram handles to all galleries)
3. **Following week**: Complete Priority 3 (Add founded_year for major galleries)

Would you like assistance with any specific step? The scripts are in place; now it's about systematic research and updating the CSV.

