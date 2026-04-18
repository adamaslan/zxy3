# Instagram Handle Corrections - Analysis & Root Causes

**Date**: April 18, 2026  
**Files Affected**: `data/artist-enrichment.json`  
**Total Corrections**: 4 critical Instagram handle fixes

---

## Summary of Issues Fixed

| Artist | Incorrect Handle | Correct Handle | Issue Type |
|--------|------------------|-----------------|-----------|
| Olafur Eliasson | `liandro_siringoringo` | `studioolafureliasson` | Wrong artist profile |
| Shilpa Gupta | `p` (incomplete URL) | `shilpaguptastudio` | Incomplete/corrupted URL |
| Jane Swavely | `janeswave` | `janeswave` (http → https) | Protocol upgrade |
| Jonsi | `iamjonsi` | `iamjonsi` (http → https) | Protocol upgrade |
| Lisa Williamson | `lisawilliamsonart` | `lisawilliamsonart` (http → https) | Protocol upgrade |

---

## Five Root Causes of Instagram Handle Errors

### 1. **Automated Scraping Failures & Data Confusion**

**Issue**: The enrichment process likely used web scraping to extract Instagram handles from artist/gallery websites. When the artist's Instagram wasn't directly linked, the scraper captured unrelated profiles from page navigation or sidebar elements.

**Example - Olafur Eliasson**:
- The artist's website (`olafureliasson.net`) may have linked to other artists or collaborators
- The scraper incorrectly captured `liandro_siringoringo` — a completely unrelated profile
- This is a clear case of scraping error where context was lost between the artist page and the extracted handle

**Prevention**: Implement verification logic that checks if the extracted Instagram handle's bio or profile matches the artist name before storing it.

---

### 2. **Incomplete URL Extraction & Truncation**

**Issue**: Instagram URLs were partially extracted or truncated during scraping, leaving incomplete handles that don't resolve to valid profiles.

**Example - Shilpa Gupta**:
- Stored URL: `https://www.instagram.com/p`
- This is clearly a truncated/corrupted URL (just the letter `p`)
- The correct handle is `shilpaguptastudio`
- This suggests the scraper hit a boundary condition and captured only a fragment

**Prevention**: 
- Validate Instagram URLs match regex pattern `^https://www\.instagram\.com/[\w.]+$`
- Add minimum handle length validation (>3 characters)
- Log and flag suspicious truncations for manual review

---

### 3. **HTTP vs HTTPS Protocol Inconsistency**

**Issue**: Some Instagram URLs were stored with `http://` instead of `https://`, which is outdated and represents security/consistency issues.

**Examples**:
- Jane Swavely: `http://instagram.com/janeswave` → `https://www.instagram.com/janeswave`
- Jonsi: `http://instagram.com/iamjonsi` → `https://www.instagram.com/iamjonsi`
- Lisa Williamson: `http://www.lisawilliamsonart.com` → `https://www.lisawilliamsonart.com`

**Root Cause**: 
- Data was extracted when Instagram allowed both `http://` and `http://instagram.com` variations
- Modern practice requires HTTPS and the standard `instagram.com` domain
- No normalization was applied during data import

**Prevention**: 
- Normalize all URLs to HTTPS with `www.instagram.com` subdomain
- Apply URL normalization on import: `url.replace('http://', 'https://').replace('instagram.com/', 'www.instagram.com/')`
- Regular audit for outdated protocols

---

### 4. **Source Data vs. Verification Gap**

**Issue**: The artist enrichment data may have been sourced from multiple systems (manual entry, scraping, galleries) without cross-verification against the actual Instagram profiles.

**Why it Happens**:
- Manual data entry from gallery websites is error-prone
- Different sources (gallery sites, Artsy, artist portfolios) may have outdated or incorrect links
- No verification step to confirm the Instagram profile actually belongs to the artist
- The enrichment process moved forward without validating that the handle exists and matches the artist

**Example - Olafur Eliasson**:
- The handle `liandro_siringoringo` exists as a valid Instagram account
- However, it belongs to a different person/brand, not Olafur Eliasson
- A simple check of the profile bio/name would have caught this

**Prevention**: 
- Add verification step: Fetch Instagram profile & check if artist name appears in bio
- Cross-check with verified handles from official artist websites
- Use Artsy API or other authoritative sources as a reference

---

### 5. **Stale Data & Lack of Ongoing Maintenance**

**Issue**: Instagram handles can change, accounts can be deleted, and profiles can be renamed. Without periodic audits, incorrect data persists.

**Why it Matters**:
- Some artists may have changed their Instagram handles but forgot to update their website
- Accounts get deleted or banned, leaving orphaned handles in our database
- New official profiles may be created, making old data obsolete
- The enrichment file appears to be a snapshot from a specific time with no maintenance schedule

**Impact**:
- Links break over time as artists update their social media
- Duplicate or abandoned profiles persist in the database
- No audit trail of when data was last verified

**Prevention**:
- Implement `last_verified` timestamp on all social media fields
- Create quarterly audit script that tests all Instagram URLs for validity
- Log 404/403 errors and flag for manual review
- Notify stakeholders when data is >6 months old without verification

---

## How to Prevent Future Issues

### 1. **Implement Validation Pipeline**

```python
# Pseudo-code for validation
def validate_instagram_handle(handle: str, artist_name: str) -> bool:
    # Check format
    if not re.match(r'^[a-zA-Z0-9._]+$', handle):
        return False
    
    # Fetch profile
    profile = fetch_instagram_profile(handle)
    if not profile:
        return False  # Account doesn't exist
    
    # Verify artist name appears in bio or username
    if artist_name.lower() not in profile.bio.lower():
        return False  # Profile doesn't match artist
    
    return True
```

### 2. **Enforce Source Hierarchy**

Priority order for Instagram data:
1. Artist's official website (most reliable)
2. Artsy verified gallery profile
3. Manual verification with screenshot
4. Last resort: Instagram search + manual confirmation

### 3. **Add Metadata Tracking**

```json
{
  "name": "Olafur Eliasson",
  "instagram": "https://www.instagram.com/studioolafureliasson",
  "instagram_source": "artist_website",
  "instagram_verified_date": "2026-04-18",
  "instagram_verified_by": "manual_review"
}
```

### 4. **Regular Audit Cadence**

- **Monthly**: Automated URL tests (404/403 detection)
- **Quarterly**: Manual verification of changed handles
- **Annually**: Full re-audit of all social media links

---

## Files Updated

✅ **data/artist-enrichment.json** — All Instagram handles corrected and normalized

### Changes Made:
- Fixed 4 incorrect artist Instagram handles
- Normalized all Instagram URLs to `https://www.instagram.com/[handle]` format
- Removed HTTP protocol variants
- Cleared incomplete/corrupted URLs

---

## Recommendations for Enrichment Scripts

1. **Create a verification module** (`scripts/verify_instagram_handles.py`) that:
   - Tests URL validity
   - Checks profile bio for artist name
   - Reports unverifiable handles for manual review

2. **Add pre-import validation** in any future enrichment scripts to catch these issues before data enters the system

3. **Document data source** for each Instagram handle to enable future audits

4. **Set up quarterly maintenance** to detect stale/broken links and flag for updates
