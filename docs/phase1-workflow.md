# Phase 1: Manual Data Collection + Conversational Extraction

## Status Tracking

Track your progress through each gallery extraction. Once you complete a gallery, mark it as done and save the extracted JSON.

### Galleries to Extract

| # | Gallery | Segment | Status | Extracted File |
|---|---------|---------|--------|---|
| 1 | Tiger Strikes Asteroid | emerging | ⬜ TODO | `data/extracted-tiger-strikes-asteroid.json` |
| 2 | Underdonk | emerging | ⬜ TODO | `data/extracted-underdonk.json` |
| 3 | Tempest on Weirfield | emerging | ⬜ TODO | `data/extracted-tempest-on-weirfield.json` |
| 4 | 15 Orient | mid-career | ⬜ TODO | `data/extracted-15orient.json` |
| 5 | King's Leap | mid-career | ⬜ TODO | `data/extracted-kingsleap.json` |
| 6 | Microscope Gallery | mid-career | ⬜ TODO | `data/extracted-microscope-gallery.json` |
| 7 | Luhring Augustine | established | ⬜ TODO | `data/extracted-luhring-augustine.json` |
| 8 | Magenta Plains | established | ⬜ TODO | `data/extracted-magenta-plains.json` |
| 9 | MoMA | late-career | ⬜ TODO | `data/extracted-moma.json` |
| 10 | Tanya Bonakdar | late-career | ⬜ TODO | `data/extracted-tanya-bonakdar.json` |

**Progress: 0/10 galleries**

---

## Workflow for Each Gallery

### Step 1: Download Source Data

For each gallery, navigate to their website and download:

1. **Artist roster/CV pages as PDFs** (if available)
   - Look for: "Artists", "Represented Artists", "Roster", "CV"
   - Use browser's "Save as PDF" feature (Cmd+P on macOS)
   
2. **Exhibition archive pages as HTML** (if available)
   - Look for: "Exhibitions", "Shows", "Past Exhibitions"
   - Use browser's "Save Page As..." (Cmd+S on macOS)
   
3. **CSV exports** (if available)
   - Some galleries provide downloadable artist lists

4. **Save files with descriptive names:**
   ```
   downloads/tiger-strikes-artists.pdf
   downloads/tiger-strikes-exhibitions.html
   ```

### Step 2: Upload to Claude and Extract

Once you have downloaded the PDFs/HTMLs:

1. **In this Claude Code session**, run a command like:
   ```
   Use the Read tool to read: downloads/tiger-strikes-artists.pdf
   ```
   (Claude will use vision to analyze the PDF)

2. **Prompt Claude** with:
   ```
   Extract all artist information from this PDF/HTML:
   - Artist name
   - Bio (if available)
   - Exhibition history (title, year, end_year if applicable)
   - Other galleries they're represented by (if mentioned)
   - Social media handles (Instagram, etc.)
   - Personal website (if listed)
   
   Return as JSON in this format:
   {
     "gallery": "tiger-strikes-asteroid",
     "segment": "emerging",
     "artists": [
       {
         "name": "Artist Name",
         "bio": "Brief bio if available",
         "shows": [
           { "title": "Exhibition Title", "year": 2024, "endYear": 2024 }
         ],
         "represented_by": ["Gallery 1", "Gallery 2"],
         "instagram": "@handle",
         "website": "https://artistsite.com"
       }
     ]
   }
   ```

3. **Spot-check the extraction:**
   - Review 3-5 random artists
   - Verify names are spelled correctly
   - Check that shows are listed with correct years
   - Note any parsing errors

### Step 3: Save to data/ Directory

Once Claude provides the JSON extraction and you've reviewed it:

1. Copy the JSON response
2. Create file: `data/extracted-[gallery-slug].json`
3. Paste the JSON

**Example:**
```bash
# Create file: data/extracted-tiger-strikes-asteroid.json
# Paste the JSON provided by Claude
```

### Step 4: Update This Tracking File

Mark the gallery as ✅ DONE in the status table above.

---

## Tips for Better Extractions

- **Large PDFs?** Upload them in sections. Claude handles 10-50 page PDFs well; split anything larger.
- **Unclear formatting?** Let Claude know: "Some artist names are on the left, bios are indented paragraphs below. Extract name + first paragraph as bio."
- **Missing data?** It's OK to have `null` values. Don't invent data.
- **Date formats?** Convert everything to YYYY format. "Spring 2023" → year: 2023.
- **Social handles?** Include @ symbol for Instagram: "@artisthandle"

---

## Expected Output

Each extracted JSON file should contain:
- **gallery** (string): slug from seed-galleries.json
- **segment** (string): "emerging" | "mid-career" | "established" | "late-career"
- **artists** (array of objects):
  - **name** (string, required)
  - **bio** (string, optional)
  - **shows** (array of {title, year, endYear}, optional)
  - **represented_by** (array of strings, optional)
  - **instagram** (string, optional)
  - **website** (string, optional)

---

## Next Steps

Once you've completed Phase 1 (all 10 galleries extracted):
1. I'll write and execute `scripts/ingest-phase2-upsert.js`
2. Script will upsert all artists to the database
3. Then Phase 3: run `npm run enrich-artists` to backfill bio/images/metrics from Artsy

**Estimated time per gallery: 10-15 minutes**

---

## Commands You'll Use in Phase 1

```bash
# List what's been extracted so far
ls -la data/extracted-*.json

# Check current progress
cat data/seed-galleries.json | jq length

# Validate JSON syntax
cat data/extracted-tiger-strikes-asteroid.json | jq .
```
