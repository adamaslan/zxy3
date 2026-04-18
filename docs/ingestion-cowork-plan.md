# 500 Galleries, 1,000 Artists — Cowork Ingestion Plan

## Goal

Populate the ZXY Gallery database with **500 galleries** and **1,000 artists**, each with **75%+ of columns filled**.

### What 75% Means

**Artist (20 fillable columns → 15 required):**
`name`, `slug`, `bio`, `website`, `cv_url`, `instagram`, `nationality`, `birth_year`, `active`, `career_stage`, `show_count_solo`, `show_count_group`, `artsy_url`, `artsy_id`, `profile_image_url` — plus at least one `ArtistGallery` join record.

**Gallery (8 fillable columns → 6 required):**
`name`, `slug`, `city`, `country`, `website`, `type` — plus `gallery_tier` and `instagram` as stretch.

---

## Current State (as of 2026-04-03 dump)

| Table | Records | Column Fill Rate |
|-------|:-------:|:----------------:|
| Artists | 67 | ~15% (name + slug only) |
| Galleries | 53 | ~35% (name, slug, type) |
| ArtistGallery | ~70 | relationship only |

Most records are skeletal — names and slugs exist but bio, website, nationality, images, and show counts are empty. Zero artists have website or instagram filled. 36 of 53 galleries are missing city/country.

### 67 Artists Already in DB

```
Ada Friedman, Amir Badawi, Amy Greco, Andrew Erdos, Annie Hayes,
Aruni Dharmakirthi, Aurora Halal, Barbara Ess, Beatriz Chachamovits,
Byron Kim, Carla Maldonado, Carlito Dalceggio, Chris Baker, Clare Hu,
Dean Cercone, Earth Ængel, Elham Goodarzi, Elisa Pritzker,
Emilie Stark-Menneg, Emma Stern, Francisco echo Eraso, Gigi Gruenburg,
Go Pushpops, Haas Brothers, Haifa Bint-Kadi, Indira Cesarine,
Irja Boden, James Baker, Jamie Martinez, Jay Milder, Jenna Hamed,
Jilaine Jones, Jordan Piantedosi, Jovanni Luna, Julie Speidel,
Justin Shoulder, Katherine Earle, Kip Davis, Laura Kimmel,
Lauren Bradshaw, Lauren Shapiro, Lena Marquise, Lina Puerta,
Magnus Maxine Flowers, Manuela Riestra, Marco Santini, Mimi Oritsky,
Mira Lehr, Nyuegen E. Smith, Ozan Ünal, Paul Latislaw, Peggy Ahwesh,
Pentti Monkkonen, Portia Zvavahera, Ray Hwang, Raymond Pettibon,
Rebecca Ness, Rhys Ziemba, Sam Rolfes, Sammy Bennett, Sarah Sze,
Taesha Aurora, Tim McCool, Travis Boyer, Wendy Klemperer,
Yasmeen Abdallah, Yasue Maetake
```

### 53 Galleries Already in DB

| Gallery | City | Country | Type |
|---------|------|---------|------|
| 15 Orient | — | — | commercial |
| 550 Gallery | — | — | commercial |
| Alexandra Arts / ART511MAG | — | — | commercial |
| Alt Esc | — | — | commercial |
| Amos Eno Gallery | — | — | commercial |
| Art Basel | Basel | Switzerland | art_fair |
| Bakehouse Art Complex | — | — | non-profit |
| Carpenter's Workshop Gallery | — | — | commercial |
| Clearing | — | — | commercial |
| David Zwirner | — | — | commercial |
| Diana New York | — | — | commercial |
| Felix Art Show | Los Angeles | USA | art_fair |
| Frieze LA | Los Angeles | USA | art_fair |
| Galeria Agustina Ferreyra | — | — | commercial |
| Galerie Manque | — | — | commercial |
| Honey Ramka | — | — | commercial |
| International Gallery | — | — | commercial |
| James Cohan | — | — | commercial |
| Jenny's | — | — | commercial |
| Jewish Museum in South Beach | Miami Beach | USA | museum |
| Jorge Andrew Gallery | — | — | commercial |
| KIPNZ | — | — | commercial |
| King's Leap | — | — | commercial |
| Luhring Augustine | — | — | commercial |
| Magenta Plains | — | — | commercial |
| Mana Contemporary | — | — | non-profit |
| Mery Gates | — | — | commercial |
| Microscope Gallery | — | — | commercial |
| Museum of Modern Art | New York | USA | museum |
| Paradice Palase | — | — | commercial |
| Pioneer Works | New York | USA | non-profit |
| Pratt Institute | New York | USA | institution |
| Provincetown Art Association & Museum | — | — | non-profit |
| Radiator Gallery | — | — | commercial |
| Robert Miller Gallery | — | — | commercial |
| Satellite Art Show | Miami Beach | USA | art_fair |
| Signal Gallery | — | — | commercial |
| SoMad | — | — | commercial |
| Spring/Break Art Show | New York | USA | art_fair |
| Tanya Bonakdar Gallery | — | — | commercial |
| Tempest | Ridgewood | USA | commercial |
| The Armory Show | New York | USA | art_fair |
| The Bass | Miami Beach | USA | museum |
| The Border | — | — | commercial |
| The Metropolitan Museum of Art | New York | USA | museum |
| The New Museum | New York | USA | museum |
| The Strzeminski Academy of Fine Arts | Łódź | Poland | institution |
| Tiger Strikes Asteroid | — | — | commercial |
| Underdonk | — | — | commercial |
| Untitled Art Fair | Miami Beach | USA | art_fair |
| Winston Wächter Fine Art | — | — | commercial |
| ZXY Gallery | — | — | commercial |

### What This Means for the Pipeline

- **Artists:** Need 933 more. All 67 existing artists need enrichment (bio, website, instagram, etc. are all empty).
- **Galleries:** Need 447 more. 36 of 53 existing galleries are missing city/country. Most are missing website.
- **Scripts must deduplicate** against these existing records by slug/name to avoid duplicates.
- The Cowork prompt below includes this data so the agent knows exactly where to start.

---

## The 5 Phases

### Phase 1 — Gallery Seed List (Target: 500 galleries)

**What:** Build a master list of 500 galleries from structured data sources.

**Sources (no scraping needed):**
- **Artsy API** (`/api/partners?size=20&page=N&type=gallery`) — paginated list of thousands of galleries with name, city, country, website, type already structured
- **Art Basel / Frieze / Armory Show exhibitor lists** — published annually as PDFs or web pages
- **ADAA member directory** (artdealers.org) — ~200 US galleries with full metadata
- **Gallery Climate Coalition directory** — ~800 global galleries

**Output:** `data/galleries-master.json` — array of 500 gallery objects with name, slug, city, country, website, type, gallery_tier.

**Column fill at end of Phase 1:**
- Gallery: name ✓, slug ✓, city ✓, country ✓, website ✓, type ✓ = **75% baseline**
- gallery_tier and instagram filled in Phase 4

---

### Phase 2 — Artist Extraction (Target: 1,000 artists)

**What:** Extract artist names and gallery associations from the 500 galleries.

**Primary source: Artsy API**
- `/api/partners/:gallery_id/artists` — returns all artists associated with a gallery
- Each artist comes with: name, artsy_id, nationality, birthday, image URLs
- One API call per gallery × 500 = 500 calls at 300ms delay = ~2.5 minutes

**Secondary sources (for galleries not on Artsy):**
- Gallery websites downloaded as PDFs → Claude extracts names in chat
- Exhibition archive pages saved as HTML → Claude parses

**Output:** `data/artists-master.json` — array of 1,000 artist objects with name, slug, career_stage, and gallery associations.

**Column fill at end of Phase 2:**
- Artist: name ✓, slug ✓, career_stage ✓, artsy_id ✓ (if from Artsy) = **~25%**

---

### Phase 3 — Database Upsert

**What:** Load all galleries and artists into CockroachDB via Prisma.

**Script:** `scripts/ingest-phase2-upsert.js`
- Reads `data/galleries-master.json` and `data/artists-master.json`
- Upserts Gallery records (on `name` unique constraint)
- Upserts Artist records (on `slug` unique constraint)
- Creates ArtistGallery join records with relationship type
- Generates slugs: `name.toLowerCase().replace(/[^a-z0-9]+/g, '-')`
- Idempotent — safe to re-run

**Column fill at end of Phase 3:**
- Same as Phase 2, but now in the database

---

### Phase 4 — Artsy Enrichment (Target: 75% fill)

**What:** Run the existing `enrich-artists-artsy.js` script to backfill artist and gallery data from the Artsy API.

**Artist fields filled by Artsy:**
| Field | Artsy Source | Fill Rate |
|-------|-------------|:---------:|
| bio | artist.biography | ~70% |
| nationality | artist.nationality | ~80% |
| birth_year | artist.birthday (parsed) | ~75% |
| website | artist.links.website | ~40% |
| instagram | artist.links.instagram | ~30% |
| artsy_url | constructed from slug | 100% |
| artsy_id | search result | ~90% |
| profile_image_url | artist._links.image | ~85% |
| show_count_solo | /shows endpoint | ~90% |
| show_count_group | /shows endpoint | ~90% |
| highest_sale_price | /sale_artworks endpoint | ~30% |
| career_stage | inferred from shows + sales | ~80% |

**Gallery fields filled by Artsy:**
| Field | Artsy Source | Fill Rate |
|-------|-------------|:---------:|
| website | GALLERY_WEBSITE_MAP + Artsy | ~90% |
| gallery_tier | computed from artist career stages | ~80% |

**Runtime:** ~300ms per artist × 1,000 = ~5 minutes for search, ~15 minutes total with detail + show + sale calls.

**Column fill at end of Phase 4:**
- Artist: **~75-80%** (bio, nationality, birth_year, shows, image, artsy data)
- Gallery: **~85%** (name, slug, city, country, website, type, tier)

---

### Phase 5 — Gap Fill (Target: remaining 75% gaps)

**What:** Fill columns that Artsy can't provide, targeting artists/galleries still below 75%.

**5a. Web search enrichment script** — for artists missing website/instagram/cv_url:
- Search `"{artist name}" artist website` → extract URL
- Search `"{artist name}" instagram` → extract handle
- Search `"{artist name}" CV site:.edu OR site:.com` → extract CV URL
- Rate: ~2 seconds per artist, only for those with gaps

**5b. Gallery metadata fill** — for galleries missing city/country/website:
- Artsy `/api/partners/:id` gives location data
- Web search fallback for non-Artsy galleries

**5c. AI bio generation** — for artists where Artsy has no bio:
- Use existing artist data (nationality, shows, galleries) to generate a 2-sentence bio
- Set `bio_generated = true` to flag AI-written bios

**Column fill at end of Phase 5:**
- Artist: **80-85%**
- Gallery: **90%+**

---

## Column Fill Audit

### Artist — 20 fillable columns

| Column | Phase Filled | Source |
|--------|:---:|--------|
| name | 2 | Gallery rosters / Artsy |
| slug | 3 | Generated from name |
| bio | 4/5 | Artsy / AI-generated |
| website | 4/5 | Artsy / web search |
| cv_url | 5 | Web search |
| instagram | 4/5 | Artsy / web search |
| nationality | 4 | Artsy |
| birth_year | 4 | Artsy |
| active | 3 | Default true |
| career_stage | 2/4 | Segment assignment / Artsy |
| show_count_solo | 4 | Artsy shows endpoint |
| show_count_group | 4 | Artsy shows endpoint |
| artsy_url | 4 | Constructed from artsy_id |
| artsy_id | 4 | Artsy search |
| highest_sale_price | 4 | Artsy sale_artworks |
| highest_sale_currency | 4 | Artsy |
| highest_sale_source | 4 | "artsy" |
| profile_image_url | 4 | Artsy |
| bio_generated | 5 | Flag |
| artsy_enriched_at | 4 | Timestamp |

**15/20 = 75% filled after Phase 4. Phase 5 pushes to 80%+.**

### Gallery — 8 fillable columns

| Column | Phase Filled | Source |
|--------|:---:|--------|
| name | 1 | Source data |
| slug | 1 | Generated |
| city | 1 | Source data / Artsy |
| country | 1 | Source data / Artsy |
| website | 1/4 | Source data / Artsy / map |
| type | 1 | Categorized on ingest |
| gallery_tier | 4 | Computed from artist stages |
| instagram | 5 | Web search |

**6/8 = 75% filled after Phase 1. Phase 4-5 pushes to 87%+.**

---

## Execution Timeline

| Phase | Work | Time | Cumulative |
|-------|------|:----:|:----------:|
| 1 | Gallery seed list (Artsy API script) | 30 min | 30 min |
| 2 | Artist extraction (Artsy API + chat) | 45 min | 1h 15m |
| 3 | Database upsert script | 15 min | 1h 30m |
| 4 | Artsy enrichment (existing script) | 20 min | 1h 50m |
| 5 | Gap fill (web search + AI bios) | 30 min | 2h 20m |

**Total: ~2.5 hours of Claude Code time.**

---

## Claude Code Cowork Prompt

Copy the prompt below into a Claude Code Cowork session. It is self-contained and references all files, scripts, and schema needed to execute the pipeline.

---

```
You are working on the ZXY Gallery project at /Users/adamaslan/code/zxy3.
The database is CockroachDB via Prisma (schema at prisma/schema.prisma).
There are currently ~67 artists and ~53 galleries in the database.

YOUR MISSION: Populate the database with 500 galleries and 1,000 artists,
each with 75%+ of their columns filled.

## Existing infrastructure

- Prisma schema: prisma/schema.prisma (models: Artist, Gallery, ArtistGallery, Artwork, ArtistMetrics)
- Prisma client singleton: prisma/globalprisma.js
- Artsy enrichment script: scripts/enrich-artists-artsy.js (backfills bio, nationality, birth_year, shows, images, instagram, artsy_url from Artsy API)
- Artsy API credentials: ARTSY_CLIENT_ID and ARTSY_CLIENT_SECRET in .env
- Existing gallery data: dumps/galleries_20260403T213107.csv (53 galleries)
- Existing artist data: dumps/artists_20260403T213104.csv (67 artists)
- Seed gallery config: data/seed-galleries.json

## Execute these phases in order

### PHASE 1: Build gallery master list (target: 500 galleries)

Write and run a script `scripts/ingest-galleries.js` that:
1. Authenticates with the Artsy API using ARTSY_CLIENT_ID/SECRET from .env
2. Paginates through /api/partners?type=gallery&size=20 to collect 500 galleries
3. For each gallery, extracts: name, city (from location), country, website, type ("commercial")
4. Generates slug from name
5. Assigns gallery_tier based on Artsy partner_type or region
6. Deduplicates against existing galleries in the database (query by name)
7. Saves to data/galleries-master.json
8. Upserts all 500 galleries into the Gallery table via Prisma

### PHASE 2: Extract artists from galleries (target: 1,000 artists)

Extend the script or write `scripts/ingest-artists.js` that:
1. For each of the 500 galleries in the database, calls Artsy API /api/partners/:id/artists
2. Collects artist name, artsy_id, nationality, birthday from the response
3. Assigns career_stage based on the gallery's segment or Artsy data
4. Deduplicates artists by slug (many artists show at multiple galleries)
5. Caps at 1,000 unique artists
6. Saves to data/artists-master.json
7. Upserts all artists into the Artist table via Prisma
8. Creates ArtistGallery join records with relationship="shown"

### PHASE 3: Run Artsy enrichment

Run the existing enrichment script:
```bash
node scripts/enrich-artists-artsy.js
```
This fills: bio, nationality, birth_year, website, instagram, artsy_url, artsy_id,
profile_image_url, show_count_solo, show_count_group, highest_sale_price, career_stage.

### PHASE 4: Gap fill for 75% target

Write and run `scripts/fill-gaps.js` that:
1. Queries all artists where more than 25% of columns are NULL
2. For each, uses web search to find:
   - website URL
   - Instagram handle
   - CV URL (look for .edu or portfolio sites)
3. For artists missing bio, generates a 2-sentence bio from available data
   (nationality, career_stage, galleries shown at, show counts) and sets bio_generated=true
4. For galleries missing city/country, looks up location from Artsy or web search
5. Reports final fill rates

### PHASE 5: Audit and report

After all phases complete:
1. Run `node scripts/dump-artworks.js` to export current state
2. Count total artists and galleries
3. For each table, calculate the percentage of non-null columns
4. Report which columns are below 75% and what would be needed to fill them
5. Save the audit to docs/ingestion-audit.md

## Important constraints

- Artsy API rate limit: add 300ms delay between calls
- Use Prisma upsert (not create) to avoid duplicate errors
- BigInt IDs must be serialized to string in any JSON output
- All scripts should be idempotent (safe to re-run)
- Do NOT scrape gallery websites with WebFetch — use Artsy API as the primary data source
- Log progress to console: "[Phase N] Processed X/Y galleries/artists"
- If any phase fails partway, the script should save progress and be resumable
```

---

## Risk Factors

| Risk | Mitigation |
|------|-----------|
| Artsy API rate limiting | 300ms delay built into all scripts; token refresh on 401 |
| Artsy doesn't have all galleries | Phase 1 sources from multiple directories, not just Artsy |
| Artist name ambiguity (common names) | Match on Artsy search, prefer exact name match |
| Artsy bio/image missing for emerging artists | Phase 5 gap fill with web search + AI bios |
| CockroachDB connection limits | Prisma singleton pattern already in globalprisma.js |
| Script crashes mid-run | All upserts are idempotent; progress logged to console |
