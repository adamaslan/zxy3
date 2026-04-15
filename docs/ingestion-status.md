# Ingestion Pipeline Status

**Date:** 2026-04-12
**Goal:** Ingest 1,000 artists across 4 career segments via a 3-phase pipeline

---

## Current State

### Database (as of last dump 2026-04-03)

| Table | Record Count |
|-------|-------------|
| Artists | 67 |
| Galleries | 53 |
| Artworks | (not checked) |

The 67 existing artists are a mix of manually entered records and Tempest on Weirfield / other gallery artists. Most lack enrichment data (nationality, birth_year, website, instagram are all empty).

53 galleries already exist in the database, including several of the 10 seed galleries:
- King's Leap, Luhring Augustine, Magenta Plains, Microscope Gallery, Tiger Strikes Asteroid, Underdonk, Tanya Bonakdar, Tempest, 15 Orient, MoMA — **all already have Gallery records**.

---

## The 3-Phase Plan

### Phase 1: Extract artist names from gallery exhibition archives (IN PROGRESS)

For each seed gallery, fetch past exhibition pages and extract artist names + show history into `data/extracted-[gallery].json` files.

| # | Gallery | Segment | Extraction Status | Artists in File | Notes |
|---|---------|---------|-------------------|:---:|-------|
| 1 | Tiger Strikes Asteroid | emerging | Extracted, then **file was deleted** | 0 | Had 56 artists; needs re-extraction or re-creation |
| 2 | Underdonk | emerging | **Modified by user** | 10 | User replaced with curated list of 10 artists |
| 3 | Tempest on Weirfield | emerging | **Modified by user** | 2 | User replaced with placeholder 2 artists |
| 4 | 15 Orient | mid-career | Extracted, then **file was deleted** | 0 | Had 29 artists; needs re-extraction or re-creation |
| 5 | King's Leap | mid-career | Extracted, then **file was deleted** | 0 | Had 71 artists; needs re-extraction or re-creation |
| 6 | Microscope Gallery | mid-career | **Not started** | 0 | Data was fetched but never saved to file |
| 7 | Luhring Augustine | established | Extracted, then **file was deleted** | 0 | Had 31 artists; needs re-extraction or re-creation |
| 8 | Magenta Plains | established | **Not started** | 0 | Web fetch was blocked; needs retry |
| 9 | MoMA | late-career | **Skipped** | 0 | User said to skip MoMA for now |
| 10 | Tanya Bonakdar | late-career | Extracted, then **file was deleted** | 0 | Had 25 artists; needs re-extraction or re-creation |

**Files currently on disk:**
- `data/extracted-underdonk.json` — 10 artists (user-curated)
- `data/extracted-tempest-on-weirfield.json` — 2 artists (user placeholder)
- `data/seed-galleries.json` — 8 galleries (MoMA removed from seed list by user)

**What happened:** Claude extracted artist data for 7 galleries (Tiger Strikes, 15 Orient, King's Leap, Luhring Augustine, Tanya Bonakdar, Underdonk, Tempest) during the session. The user then modified Underdonk and Tempest files with their own curated data, and the other 5 extraction files were removed from disk.

### Phase 2: Upsert to database (NOT STARTED)

Write and run `scripts/ingest-phase2-upsert.js` to:
- Read all `data/extracted-*.json` files
- Upsert Gallery records (most already exist)
- Upsert Artist records with `career_stage` from segment
- Create ArtistGallery join records
- Generate slugs from names
- Track progress in `data/ingestion_status.json`

**Script does not exist yet.** Will be written once Phase 1 extractions are complete.

### Phase 3: Artsy enrichment (SCRIPT EXISTS)

`scripts/enrich-artists-artsy.js` already exists and will backfill:
- Bio, nationality, birth_year
- Show counts (solo/group), highest sale price
- Profile image, artsy_url, artsy_id
- Instagram handle

Run with `npm run enrich-artists` after Phase 2 completes.

---

## What's Left to Do

### Immediate (Phase 1 completion)

1. **Re-extract or re-create** the 5 deleted gallery files:
   - `extracted-tiger-strikes-asteroid.json` (56 artists from NY past shows 2014-2026)
   - `extracted-15orient.json` (29 artists from archive)
   - `extracted-kingsleap.json` (71 artists from exhibitions 2017-2026)
   - `extracted-luhring-augustine.json` (31 artists from exhibitions 2022-2026)
   - `extracted-tanya-bonakdar.json` (25 artists from exhibitions 2023-2026)

2. **Extract Microscope Gallery** — data was fetched but never written to a file. ~60+ artists from exhibitions 2011-2026.

3. **Extract Magenta Plains** — web fetch was interrupted. Need to retry.

4. **Decide on MoMA** — user deferred this. MoMA has 15,000+ artists; needs filtering strategy (e.g., only artists who overlap with other seed galleries).

### Phase 2

5. **Write `scripts/ingest-phase2-upsert.js`** — Prisma upsert script that reads all extracted JSON and loads into CockroachDB.

6. **Run the upsert** and verify records in database.

### Phase 3

7. **Run `npm run enrich-artists`** — backfill bio, images, metrics from Artsy API (~45 min for 1,000 artists).

---

## Artist Count Projection

| Gallery | Segment | Extracted | In DB Already | Net New (est.) |
|---------|---------|:---------:|:------------:|:--------------:|
| Tiger Strikes Asteroid | emerging | 56 | ~0 | ~56 |
| Underdonk | emerging | 10 | ~2 | ~8 |
| Tempest on Weirfield | emerging | 2 | ~15 | ~0 |
| 15 Orient | mid-career | 29 | ~1 | ~28 |
| King's Leap | mid-career | 71 | ~1 | ~70 |
| Microscope Gallery | mid-career | ~60 | ~2 | ~58 |
| Luhring Augustine | established | 31 | 0 | ~31 |
| Magenta Plains | established | TBD | ~3 | TBD |
| MoMA | late-career | Skipped | 0 | TBD |
| Tanya Bonakdar | late-career | 25 | ~0 | ~25 |
| **Total from seeds** | | **~284+** | **~24** | **~276+** |

To reach 1,000, options include:
- **Restore the deleted extraction files** (adds ~212 artists back)
- **Complete Microscope + Magenta Plains** (adds ~80-100)
- **Add MoMA with filtering** (could add 100-500 depending on criteria)
- **Phase 3.5 discovery** — use Artsy enrichment to find secondary galleries

---

## File Inventory

```
data/
  seed-galleries.json                    # 8 seed galleries (MoMA removed)
  extracted-underdonk.json               # 10 artists (user-curated)
  extracted-tempest-on-weirfield.json    # 2 artists (user placeholder)
  .extraction-template.json             # JSON format reference

scripts/
  enrich-artists-artsy.js               # Phase 3 (exists, ready to run)
  ingest-phase2-upsert.js               # Phase 2 (does not exist yet)

docs/
  ingestion-optimization.md             # Original pipeline design doc
  ingestion-status.md                   # This file
  phase1-workflow.md                    # Step-by-step Phase 1 guide

dumps/
  artists_20260403T213104.csv           # 67 artists in DB
  galleries_20260403T213107.csv         # 53 galleries in DB
```
