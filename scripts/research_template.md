# Gallery Enrichment Research Template

Copy this template for each gallery you research. Fill in the sections and use the findings to update the CSV.

---

## Gallery Research Form

```
GALLERY NAME: ________________

SECTION 1: WEBSITE VERIFICATION
─────────────────────────────────
Current URL: ________________
URL Status: 
  [ ] Loads successfully (HTTP 200)
  [ ] Redirects to: ________________
  [ ] Returns error (404, 403, SSL error, etc.): ________________
  [ ] Cannot connect (DNS error, timeout, etc.): ________________
  [ ] Gallery appears closed/inactive

Final URL to use: ________________
Action: [ ] Keep current | [ ] Update to above | [ ] Mark as inactive

SECTION 2: INSTAGRAM
────────────────────
Official handle: @________________
URL: https://instagram.com/________________
Confirmed: [ ] Yes | [ ] No
Followers: ________________
Notes: ________________

Action: [ ] Add to CSV | [ ] Skip (not found)

SECTION 3: FOUNDING DATE
────────────────────────
Founded year: ________________
Source: 
  [ ] Gallery website (About/History page)
  [ ] Artsy profile: ________________
  [ ] Wikipedia or press articles
  [ ] Other: ________________

Confidence: [ ] High | [ ] Medium | [ ] Low
Action: [ ] Add to CSV | [ ] Skip (uncertain)

SECTION 4: GALLERY STATUS
─────────────────────────
Current status: 
  [ ] Active - operating normally
  [ ] Active - limited hours/schedule
  [ ] Closed - permanently
  [ ] Closed - temporarily (on hiatus)
  [ ] Relocated - moved to: ________________
  [ ] Unknown/Uncertain

Evidence:
  [ ] Recent exhibitions on website (dates: ________________)
  [ ] Social media activity (last post: ________________)
  [ ] Google Maps reviews (recent: [ ] Yes | [ ] No)
  [ ] News/press mentions (date: ________________)
  [ ] Other: ________________

Final status for CSV: ________________

SECTION 5: ADDITIONAL NOTES
───────────────────────────
- Location accuracy verified: [ ] Yes | [ ] No
- Country matches location: [ ] Yes | [ ] No
- Gallery type is accurate: [ ] Yes | [ ] No
- Multi-location? [ ] Yes | [ ] No → How many: ____
- Contact info found: [ ] Email | [ ] Phone | [ ] Address
- Notes: ________________________________________

FINAL ACTIONS
─────────────
Last verified: ________________ (today's date)
Updates to make:
  [ ] website: ________________
  [ ] instagram: ________________
  [ ] founded_year: ________________
  [ ] status: ________________
  [ ] other: ________________

Confidence in updates: [ ] High | [ ] Medium | [ ] Low
```

---

## Example: Completed Research

```
GALLERY NAME: David Zwirner

SECTION 1: WEBSITE VERIFICATION
─────────────────────────────────
Current URL: https://www.davidzwirner.com
URL Status: 
  [X] Loads successfully (HTTP 200)
  [ ] Redirects to: 
  [ ] Returns error (404, 403, SSL error, etc.): 
  [ ] Cannot connect (DNS error, timeout, etc.): 
  [ ] Gallery appears closed/inactive

Final URL to use: https://www.davidzwirner.com
Action: [X] Keep current | [ ] Update to above | [ ] Mark as inactive

SECTION 2: INSTAGRAM
────────────────────
Official handle: @davidzwirner
URL: https://instagram.com/davidzwirner
Confirmed: [X] Yes | [ ] No
Followers: 1.2M
Notes: Very active, multiple posts per week

Action: [X] Add to CSV | [ ] Skip (not found)

SECTION 3: FOUNDING DATE
────────────────────────
Founded year: 1993
Source: 
  [X] Gallery website (About/History page)
  [ ] Artsy profile: 
  [ ] Wikipedia or press articles
  [ ] Other: 

Confidence: [X] High | [ ] Medium | [ ] Low
Action: [X] Add to CSV | [ ] Skip (uncertain)

SECTION 4: GALLERY STATUS
─────────────────────────
Current status: 
  [X] Active - operating normally
  [ ] Active - limited hours/schedule
  [ ] Closed - permanently
  [ ] Closed - temporarily (on hiatus)
  [ ] Relocated - moved to: 
  [ ] Unknown/Uncertain

Evidence:
  [X] Recent exhibitions on website (dates: March-June 2026)
  [X] Social media activity (last post: Apr 14, 2026)
  [X] Google Maps reviews (recent: [X] Yes | [ ] No)
  [ ] News/press mentions (date: )
  [ ] Other: 

Final status for CSV: active

SECTION 5: ADDITIONAL NOTES
───────────────────────────
- Location accuracy verified: [X] Yes | [ ] No
- Country matches location: [X] Yes | [ ] No
- Gallery type is accurate: [X] Yes | [ ] No
- Multi-location? [X] Yes | [ ] No → How many: 5 (NY, London, Paris, Hong Kong, LA)
- Contact info found: [X] Email [ ] Phone [X] Address
- Notes: Major gallery, well-maintained website, very active on social media, clear multi-location presence

FINAL ACTIONS
─────────────
Last verified: 2026-04-16
Updates to make:
  [X] website: https://www.davidzwirner.com (no change needed)
  [X] instagram: davidzwirner
  [X] founded_year: 1993
  [X] status: active
  [ ] other: 

Confidence in updates: [X] High | [ ] Medium | [ ] Low
```

---

## Quick Research Tips

### Website Check
```bash
# Test if a URL loads
curl -I https://example.com

# Check HTTP status code
curl -s -o /dev/null -w "%{http_code}\n" https://example.com
# 200 = OK
# 301/302 = Redirect
# 404 = Not found
# 403 = Forbidden
```

### Instagram Research
```
# Search strategies:
1. Gallery name as-is (e.g., @davidzwirner)
2. Gallery name + city (e.g., @davidzwirnernewyork)
3. Gallery name with underscores (e.g., @david_zwirner)
4. Acronym version (e.g., @dz or @dzart)
5. Visit gallery website → look for social media footer
```

### Founded Year Research Priority
```
1. Gallery website → About, History, or Contact pages
2. Artsy.net profile (search: artsy.net/partner/[gallery-slug])
3. Wikipedia search for gallery name
4. Google News search "[Gallery Name] founded" or "established"
5. Gallery directory listings (Artnet, Saatchi Art, etc.)
```

### Status Verification Quick Checks
```
Active gallery signs:
✓ Website loads and is current
✓ Recent exhibitions listed (last 6 months)
✓ Social media posts in last 2 weeks
✓ Google Maps shows open hours
✓ Recent Google reviews

Closed/Inactive signs:
✗ Website returns 404 or doesn't load
✗ No exhibitions listed or all >2 years old
✗ No social media activity >6 months
✗ Google Maps shows "Closed" status
✗ News articles about closure
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Website redirects, not sure of final URL | Use the redirect destination in CSV |
| Instagram not found | Check website footer, Google Images, Artsy profile |
| Gallery might be closed but website still loads | Check for recent exhibitions; search Google News for "[gallery name] closed" |
| Founded year conflicts between sources | Use earliest reliable date; mark confidence as "medium" if uncertain |
| Multi-location gallery, unsure about all locations | Use gallery website as source of truth; verify against locations in CSV |
| Can't find Instagram despite searching | It's okay to leave blank; not all galleries are on Instagram |

---

## Research Session Log

Track your research progress:

```markdown
# Research Session - [Date]

## Completed Today
- [ ] Gallery 1: ________________ (status: __________)
- [ ] Gallery 2: ________________ (status: __________)
- [ ] Gallery 3: ________________ (status: __________)
- [ ] Gallery 4: ________________ (status: __________)
- [ ] Gallery 5: ________________ (status: __________)

## Total time spent: __ minutes
## Galleries updated: __/52
## Progress: __%

## Notes for next session:
- ________________________
- ________________________
```

---

## Batch Update Template

Once you've researched a batch of galleries, use this to update the CSV:

```python
# Add to enrich_galleries.py:

INSTAGRAM_UPDATES = {
    "Gallery Name": "instagram_handle",
    "Another Gallery": "another_handle",
}

FOUNDED_YEAR_UPDATES = {
    "Gallery Name": 2018,
    "Another Gallery": 1995,
}

STATUS_UPDATES = {
    "Closed Gallery Name": "closed",
    "Relocated Gallery": "relocated",
}

# Then run the enrichment script to apply all updates at once
```

---

Good luck with your research! This template makes it easy to stay organized and ensure consistent, high-quality updates to the CSV.
