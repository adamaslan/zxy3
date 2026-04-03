# Optimizing the 1,000-Artist Autonomous Ingestion Pipeline

## The Problem with the Raw Spec

The spec as written asks Claude Code to act as a browser-based web scraper visiting ~10 gallery websites, recursively discovering artists, navigating CVs, and upserting 1,000 records. Here's why that's impractical as-is and how to restructure it into something that works with Claude Code's actual strengths: **conversational data extraction and Prisma scripting**, not headless browser automation.

---

## 1. Conversational Extraction Beats Automated Scraping

**Issue:** Claude Code's `WebFetch` tool fetches raw HTML/text. It is not a headless browser and cannot:
- Execute JavaScript (most gallery sites are SPAs)
- Navigate paginated "Viewing Room" interfaces
- Render PDFs reliably
- Maintain session state

**Optimization:** Replace automated scraping with **conversational extraction**:

| Source | What it provides | How you get it |
|--------|------------------|:---|
| **Gallery PDFs/CVs** | Artist names, bios, show history, represented by | You download; Claude reads and extracts |
| **Gallery HTML rosters** | Artist names, profiles, images | You save HTML; Claude parses |
| **Artsy API** (existing) | Bio, shows, sales prices, images, metrics | Phase 3 enrichment script |

**Why this works:**
- Claude's vision handles any PDF format (scanned, photos, inconsistent layouts)
- No regex/HTML parsing needed -- Claude understands context
- You maintain quality control by spot-checking
- Much faster than building a robust scraper: 10-15 min per gallery in chat vs. hours debugging selectors

---

## 2. Restructure into Three Phases (Not One Loop)

### Phase 1: Manual Data Collection + Claude Code Extraction (Conversational)
**You download the source data; Claude Code extracts and structures it.**

For each seed gallery:
1. **You** navigate to the gallery website and download:
   - Artist roster/CV pages as PDFs
   - Exhibition archive pages as HTML (save with Save As)
   - Any CSV exports available
2. **Claude Code** (in chat):
   - You upload the PDF/HTML/CSV to the conversation
   - Prompt Claude to extract: artist names, bios, exhibition dates, gallery relationships
   - Claude returns structured JSON: `{ segment, gallery, artists: [{ name, bio, shows, represented_by }] }`
   - You copy the JSON into a file: `data/extracted-[gallery-slug].json`

**Why this works:**
- Claude's vision and document parsing handles PDFs, scanned images, inconsistent formatting
- No fragile HTML parsing or JS execution needed
- You maintain quality control by spot-checking extractions
- Much faster than automated scraping for 10 galleries

**Tools Claude Code uses in this phase:**
- Read (upload PDFs as file paths)
- Vision (if PDFs have artist photos/context)
- Direct chat responses (structured JSON output)

### Phase 2: Database Upsert (Prisma Script in Claude Code)
Claude Code writes and executes a Node.js script (`scripts/ingest-phase2-upsert.js`) that:
- Reads all `data/extracted-*.json` files
- Upserts `Gallery` records from seed gallery list
- Upserts `Artist` records with `career_stage` set by segment
- Creates `ArtistGallery` join records
- Generates slugs from names (`name.toLowerCase().replace(/\s+/g, '-')`)
- Tracks progress in `ingestion_status.json`

Claude Code can:
- Write the script (Write tool)
- Test it locally (Bash tool)
- Handle Prisma client setup and error handling
- Resume from `ingestion_status.json` if it fails partway through

### Phase 3: Enrichment (Already Exists)
Run the existing `enrich-artists-artsy.js` to backfill:
- Bio, nationality, birth_year
- Show counts, highest sale price
- Profile image, artsy_url, artsy_id
- Instagram handle
- Gallery website URLs and tier

```bash
npm run enrich-artists
```

---

## 3. The "Closed Loop" Discovery: Bounded by Phase 2

**Issue:** The spec's recursive protocol ("find new galleries in CVs, add to queue") creates an unbounded crawl.

**Optimization:** Let **Phase 3's Artsy enrichment** drive bounded discovery:

1. Phase 1 + 2: Ingest the 10 seed galleries → ~400-570 artists in DB
2. Phase 3: Run `npm run enrich-artists` → Artsy API populates `artsy_id`, `show_count_solo/group`, and gallery relationships
3. **Post-enrichment discovery** (optional Phase 3.5):
   - Query Artsy API's `partner_shows` endpoint for each artist
   - Extract gallery names from structured show data
   - If a discovered gallery matches the segment tier, mark it as "secondary seed"
   - Manually curate 2-5 secondary seeds per segment
   - Re-run Phase 1 on secondary galleries only
4. Re-run Phase 2 + Phase 3 to backfill new artists

**Why this works:**
- You're not chasing unbounded gallery chains
- Artsy's API gives you structured data (no fragile HTML parsing)
- You control the discovery gate (manual review of secondary galleries)
- You can stop at 1,000 artists without needing to ingest the entire art world

---

## 4. Realistic Column Coverage

The spec asks for 25 columns per artist. Here's what each source can actually provide:

| Column | Gallery Site | Artsy API | Manual/Inferred |
|--------|:---:|:---:|:---:|
| `name` | Y | Y | - |
| `slug` | - | Y | Generated |
| `bio` | Rare | Y | - |
| `nationality` | Rare | Y | - |
| `birth_year` | Rare | Y | - |
| `career_stage` | - | Partial | Segment assignment |
| `cv_url` | Sometimes | - | - |
| `artsy_url` | - | Y | - |
| `instagram` | Sometimes | Y | - |
| `website` | Sometimes | Y | - |
| `show_count_solo` | - | Y | - |
| `show_count_group` | - | Y | - |
| `highest_sale_price` | - | Y | - |
| `profile_image_url` | - | Y | - |
| `active` | - | - | Inferred from show dates |
| Artwork `image_url` | Sometimes | Y | - |
| Artwork `title` | Sometimes | Y | - |
| Artwork `medium` | Rare | Y | - |
| Artwork `dimensions` | Rare | Y | - |

**Bottom line:** Gallery websites give you names and exhibition context. Artsy gives you the structured data. Don't try to scrape what an API already provides.

---

## 5. Practical File Architecture

```
data/
  seed-galleries.json              # Gallery metadata (you create this once)
  extracted-tiger-strikes.json     # Claude extracts from PDFs/HTMLs
  extracted-underdonk.json         # ↓ repeat for each seed gallery ↓
  extracted-tempest.json
  extracted-15orient.json
  extracted-kingsleap.json
  extracted-microscope.json
  extracted-luhring-augustine.json
  extracted-magenta-plains.json
  extracted-moma.json
  extracted-tanya-bonakdar.json

scripts/
  ingest-phase2-upsert.js         # Claude writes & executes this
  enrich-artists-artsy.js         # (existing) already present
```

### seed-galleries.json format (you create this once):
```json
[
  {
    "name": "Tiger Strikes Asteroid",
    "slug": "tiger-strikes-asteroid",
    "website": "https://www.tigerstrikesasteroid.com",
    "segment": "emerging",
    "tier": "emerging"
  },
  {
    "name": "15 Orient",
    "slug": "15orient",
    "website": "https://15orient.com",
    "segment": "mid-career",
    "tier": "mid"
  }
]
```

### extracted-[gallery].json format (Claude produces these):
```json
{
  "gallery": "tiger-strikes-asteroid",
  "segment": "emerging",
  "artists": [
    {
      "name": "Artist Name 1",
      "bio": "Brief bio if available",
      "shows": [
        { "title": "Exhibition Title", "year": 2024, "endYear": 2024 }
      ],
      "represented_by": ["Gallery Name", "Another Gallery"],
      "instagram": "@handle",
      "website": "https://artistsite.com"
    }
  ]
}
```

### ingestion_status.json format (Phase 2 auto-generates and updates):
```json
{
  "counts": {
    "emerging": 147,
    "mid-career": 203,
    "established": 89,
    "late-career": 31
  },
  "processed_galleries": ["tiger-strikes-asteroid", "underdonk"],
  "pending_galleries": [],
  "last_run": "2026-04-03T12:00:00Z",
  "errors": []
}
```

---

## 6. Quality Control & Error Recovery

- **Manual review:** You spot-check Claude's extractions before copying to `data/extracted-*.json`
- **Deduplication:** Phase 2 script deduplicates artists by slug (name-based) to avoid duplicates across galleries
- **Idempotency:** Prisma `upsert` on `slug` for artists, `name` for galleries ensures re-running Phase 2 is safe
- **Resume:** `ingestion_status.json` tracks which galleries are done; you can skip already-processed galleries in Phase 1
- **Artsy enrichment:** The existing script handles rate limiting (300ms delay). Run during off-peak hours.

---

## 7. Claude Code's Role: Conversational Data Extraction + Scripting

Claude Code excels at two things here:

### Phase 1: You + Claude Chat (Conversational)
| Task | Feasible? | How |
|------|-----------|-----|
| Extract artist names from PDFs | Yes | Claude reads file, outputs structured JSON |
| Parse CVs and show histories | Yes | Claude's vision understands any format |
| Extract gallery relationships | Yes | Claude can infer from context |
| Handle inconsistent formatting | Yes | Claude adapts to any structure |
| Spot-check and validate | Yes | You review in chat before saving |

### Phase 2: Claude Code Scripts (Automation)
| Task | Feasible? | How |
|------|-----------|-----|
| Write Prisma bulk upsert script | Yes | Write tool |
| Execute upserts to CockroachDB | Yes | Bash + node |
| Track progress in JSON | Yes | Write tool for status updates |
| Handle errors and resume | Yes | Script error handling + idempotent upserts |

### Recommended Workflow (Multi-Session)

**Session 1:**
1. Create `data/seed-galleries.json` (one-time setup)
2. Download PDFs/HTMLs for first 2-3 galleries manually
3. Upload to Claude chat, extract structured JSON
4. Save extracted JSON to `data/` directory

**Session 2:**
1. Continue Phase 1 for remaining 7-8 galleries (2-3 per session)
2. Each upload → extract → save cycle takes ~10-15 min per gallery

**Session N (final):**
1. Claude writes `scripts/ingest-phase2-upsert.js`
2. Claude executes: `node scripts/ingest-phase2-upsert.js`
3. Monitor `ingestion_status.json` for completion
4. Manual verification of a few inserted records in DB

**Then (outside Claude Code):**
1. Run `npm run enrich-artists` (takes 30-60 min, can run in background)
2. Query results from DB to verify

---

## 8. Achieving the 1,000 Target

Back-of-envelope math for the seed galleries:

| Gallery | Segment | Estimated Artists |
|---------|---------|:-:|
| Tiger Strikes Asteroid | emerging | 80-120 |
| Underdonk | emerging | 30-50 |
| Tempest on Weirfield | emerging | 20-40 |
| 15 Orient | mid-career | 40-60 |
| King's Leap | mid-career | 30-50 |
| Microscope Gallery | mid-career | 50-80 |
| Luhring Augustine | established | 40-60 |
| Magenta Plains | established | 30-50 |
| MoMA | late-career | 1000+ (need filtering) |
| Tanya Bonakdar | late-career | 40-60 |

**Total from seeds alone: ~360-570 unique artists.**

To reach 1,000, the Artsy-based discovery (Phase 3 follow-up) will surface 2-5 additional galleries per seed, easily filling the remaining quota. For MoMA, filter to artists who have shown at the seed galleries or match specific criteria (birth_year, nationality, etc.) to avoid ingesting their entire 10,000+ artist roster.

---

## 9. Summary: The Optimized Plan

Instead of trying to automate a complex web scraper, **play to Claude Code's strengths:**

1. **You download; Claude extracts.** Manual data collection + Claude's vision/document parsing = high quality, zero fragile HTML parsing.
2. **Three phases, each independent.** Phase 1 (chat) -> Phase 2 (script) -> Phase 3 (existing). Pause between sessions as needed.
3. **Bounded discovery.** Start with 10 seed galleries. Use Artsy enrichment to drive secondary gallery selection. Cap at 1,000 artists total.
4. **Progressive filling.** Upsert artist names first. Backfill bio/images/metrics later via Artsy enrichment.
5. **Stateful tracking.** `ingestion_status.json` lets you resume Phase 2 if it fails partway.
6. **Leverage existing code.** `enrich-artists-artsy.js` already handles bio, shows, prices, images, Instagram. Don't rewrite it.

**Execution timeline:**
- **Phase 1:** 6-8 sessions × 10-15 min per gallery (conversational, can spread over days)
- **Phase 2:** 1 session × 15 min to write and run upsert script
- **Phase 3:** Background job, ~45 min to enrich 1,000 artists with Artsy data

**Total:** ~2-3 hours of active Claude Code time + 45 min background enrichment = 1,000 high-quality artist records.
