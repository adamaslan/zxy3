# B2B Spinout Implementation Guide

**Created:** May 7, 2026  
**Purpose:** Implementation roadmap for the first three B2B products that can be spun out from the current ZXY data collection, enrichment, gallery audit, and trending infrastructure.

---

## Executive Summary

Build the first three products as one shared intelligence platform:

1. **Artist Momentum Radar** - ranked artist discovery and trend dashboards.
2. **Roster & Representation Change Alerts** - alerts when artist-gallery relationships change or become more valuable.
3. **Verified Gallery Intelligence API** - a clean B2B feed of gallery, artist, relationship, status, and verification data.

The strongest product wedge is not a generic art directory. It is a verified signal system for the art market:

- Who is gaining momentum?
- Which galleries represent, show, or recently showed them?
- Which galleries are active, unreachable, relocated, or changing?
- What changed since the last verification run?
- Can another business consume this data reliably by dashboard, alerts, CSV, or API?

The first three products should share one data layer, one verification workflow, and one scoring engine. The commercial packaging can be separate.

---

## Current Local Assets

Use the existing repo as the foundation:

| Asset | File | Product Value |
|---|---|---|
| Artist records | `data/artists-consolidated.csv` | Base entity list, artist websites, Instagram, CV URLs, gallery history |
| Gallery records | `data/galleries-consolidated.csv` | Gallery entity list, location, type, website, status |
| Artist-gallery links | `data/artist-gallery-consolidated.csv` | Relationship graph for roster and representation intelligence |
| Gallery audit tooling | `scripts/audit_galleries.py` | Verification engine for Gallery Intelligence API |
| Gallery enrichment tooling | `scripts/enrich_galleries.py` | Batch fixes and status updates |
| Artist enrichment tooling | `scripts/extract-social-and-cv.py` | CV and Instagram discovery |
| Trending system | `docs/trending-system.md` and `lib/trending/` | Existing ranking infrastructure |
| Upcoming openings | `data/upcoming-openings.md` | Early event signal source |
| API v2 plan | `docs/API_V2.md` | Existing endpoint conventions |

Current data shape as of the latest local inspection:

- 52 galleries, with 40 active and 12 marked `inactive_website_unreachable`.
- 579 artists.
- 513 artists with `galleries_exhibited`.
- 48 artists with websites.
- 43 artists with CV URLs.
- 24 artists with Instagram URLs.
- Existing trend scoring supports internal metrics and external metrics.

---

## Platform Architecture

Treat the platform as four layers:

1. **Entity Layer**
   - Artists
   - Galleries
   - Artist-gallery relationships
   - Exhibitions and events
   - Source evidence

2. **Verification Layer**
   - Website reachability
   - Instagram validity
   - Gallery status
   - Last verified dates
   - Source confidence

3. **Signal Layer**
   - Momentum scores
   - Relationship changes
   - Gallery status changes
   - Exhibition and fair appearances
   - CV-derived career milestones

4. **Product Layer**
   - Dashboard for Artist Momentum Radar
   - Alerts for roster and representation changes
   - API/feed for Verified Gallery Intelligence

---

## Shared Data Model

The existing Prisma schema already has `Artist`, `Gallery`, `ArtistGallery`, and `ArtistMetrics`. Add the minimum additional models needed for commercial-grade freshness and explainability.

Implementation note: the model snippets below are intentionally focused on the new tables. When copying them into `prisma/schema.prisma`, also add the corresponding inverse relation arrays to `Artist` and `Gallery` where Prisma requires them.

### Source Evidence

Every important claim should have a source. This makes the data sellable.

Recommended model:

```prisma
model SourceEvidence {
  id           BigInt   @id @default(sequence())
  entityType   String   @map("entity_type") // artist | gallery | relationship | event
  entityId     String   @map("entity_id")
  fieldName    String   @map("field_name")
  value        String?
  sourceUrl    String?  @map("source_url")
  sourceType   String   @map("source_type") // website | instagram | artsy | cv | manual | scraper
  confidence   Float    @default(0.75)
  observedAt   DateTime @default(now()) @map("observed_at")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([fieldName, observedAt])
  @@map("source_evidence")
}
```

### Gallery Verification Snapshot

This powers the Verified Gallery Intelligence API and the gallery change alerts.

```prisma
model GalleryVerificationSnapshot {
  id             BigInt   @id @default(sequence())
  galleryId      Int      @map("gallery_id")
  website        String?
  httpStatus     Int?     @map("http_status")
  status         String   // active | unreachable | closed | relocated | unknown
  instagram      String?
  artistCount    Int?     @map("artist_count")
  locationsHash  String?  @map("locations_hash")
  verifiedAt     DateTime @default(now()) @map("verified_at")

  gallery        Gallery  @relation(fields: [galleryId], references: [id])

  @@index([galleryId, verifiedAt])
  @@index([status, verifiedAt])
  @@map("gallery_verification_snapshots")
}
```

### Artist Signal Snapshot

This gives the Momentum Radar a durable history instead of only a current rank.

```prisma
model ArtistSignalSnapshot {
  id                   BigInt   @id @default(sequence())
  artistId             BigInt   @map("artist_id")
  window               String   // 7d | 30d | 90d
  momentumScore         Float    @map("momentum_score")
  rank                 Int?
  percentile           Float?
  scoringMode          String?  @map("scoring_mode")
  instagramFollowers   Int?     @map("instagram_followers")
  soloShowCount        Int      @default(0) @map("solo_show_count")
  groupShowCount       Int      @default(0) @map("group_show_count")
  gallerySignalCount   Int      @default(0) @map("gallery_signal_count")
  eventSignalCount     Int      @default(0) @map("event_signal_count")
  computedAt           DateTime @default(now()) @map("computed_at")

  artist               Artist   @relation(fields: [artistId], references: [id])

  @@index([window, rank])
  @@index([artistId, computedAt])
  @@map("artist_signal_snapshots")
}
```

### Relationship Change

This powers roster and representation alerts.

```prisma
model RelationshipChange {
  id              BigInt   @id @default(sequence())
  artistId        BigInt   @map("artist_id")
  galleryId       Int      @map("gallery_id")
  changeType      String   @map("change_type") // added | removed | upgraded | downgraded | first_seen | changed_type
  previousValue   String?  @map("previous_value")
  currentValue    String?  @map("current_value")
  sourceUrl       String?  @map("source_url")
  confidence      Float    @default(0.75)
  detectedAt      DateTime @default(now()) @map("detected_at")
  reviewed        Boolean  @default(false)

  artist          Artist   @relation(fields: [artistId], references: [id])
  gallery         Gallery  @relation(fields: [galleryId], references: [id])

  @@index([artistId, detectedAt])
  @@index([galleryId, detectedAt])
  @@index([changeType, detectedAt])
  @@map("relationship_changes")
}
```

### Alert

This turns signals into a B2B workflow.

```prisma
model Alert {
  id          BigInt   @id @default(sequence())
  alertType   String   @map("alert_type") // momentum_spike | roster_change | gallery_status | event_added
  severity    String   // low | medium | high
  title       String
  body        String?
  entityType  String   @map("entity_type")
  entityId    String   @map("entity_id")
  payload     Json?
  sentAt      DateTime? @map("sent_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([alertType, createdAt])
  @@index([entityType, entityId])
  @@map("alerts")
}
```

---

## Product 1: Artist Momentum Radar

### Buyer

- Art advisors
- Curators
- Emerging gallery directors
- Collector research teams
- Art funds and market analysts
- Art media and newsletter operators

### Core Promise

"Find artists gaining credible momentum before everyone is talking about them."

### MVP Features

- Top artists by 7d, 30d, and 90d momentum.
- Artist profile pages with:
  - Trend score
  - Rank history
  - Gallery relationships
  - CV URL
  - Instagram URL
  - Website
  - Recent exhibitions or openings
  - Source evidence
- Filters:
  - Career stage
  - Gallery tier
  - City
  - Gallery type
  - Has CV
  - Has Instagram
  - Recently verified
- Export:
  - CSV
  - JSON
  - Saved watchlist

### Scoring Inputs

Start with fields already present or planned:

| Signal | Source | Weight Direction |
|---|---|---|
| Gallery count | `galleries_exhibited`, `ArtistGallery` | Positive |
| Gallery quality/tier | `Gallery.gallery_tier` | Positive |
| Recent show/event | `data/upcoming-openings.md`, future event table | Strong positive |
| Instagram followers | `instagram_followers` | Positive, soft-capped |
| CV presence | `cv_url` | Positive confidence boost |
| Solo/group show counts | CV parser or Artsy enrichment | Positive |
| Verified data freshness | `last_verified`, snapshots | Positive confidence boost |
| Gallery status risk | inactive/unreachable gallery links | Negative confidence adjustment |

### Implementation Steps

1. Normalize artist and gallery CSVs into the database.
2. Backfill `ArtistGallery` from `galleries_exhibited` and `artist-gallery-consolidated.csv`.
3. Extend the current scorer in `lib/trending/scorer.js` to include gallery and event signals.
4. Persist rank history in `ArtistSignalSnapshot`.
5. Add API endpoints:
   - `GET /api/v2/b2b/momentum/artists`
   - `GET /api/v2/b2b/momentum/artists/:id`
   - `GET /api/v2/b2b/momentum/snapshots/:artist_id`
6. Build a dashboard page:
   - `/b2b/momentum`
   - `/b2b/artists/[id]`
7. Add saved watchlists after the ranking view is useful.

### MVP Acceptance Criteria

- At least 250 artists ranked.
- Every ranked artist has a visible reason for the score.
- Top 50 artists can be exported.
- Rank history is stored on every computation run.
- Users can filter by gallery, city, career stage, and verification freshness.

### Product 1 Implementation Checklist

**Frontend-first slice completed May 7, 2026.**

- [x] Create dedicated Momentum Radar route at `/b2b/momentum`.
- [x] Render dashboard from current local CSV assets before the B2B backend exists.
- [x] Read `data/artists-consolidated.csv`, `data/galleries-consolidated.csv`, and `data/upcoming-openings.md` in `getStaticProps` when available.
- [x] Fall back to tracked extracted gallery JSON files and `data/seed-galleries.json` so the PR builds from the default branch.
- [x] Compute a provisional frontend momentum score for 7d, 30d, and 90d windows.
- [x] Show ranked artist table with score, career-stage proxy, gallery count, evidence pills, and watchlist UI.
- [x] Add artist detail panel with signal breakdown, gallery associations, source evidence, and outbound links.
- [x] Add search, stage filter, and signal filters for CV, Instagram, website, recent event, and top-gallery association.
- [x] Add CSV export for the currently filtered/ranked view.
- [x] Add responsive CSS module for the dashboard.
- [ ] Replace provisional frontend scoring with shared scoring logic from `lib/trending/scorer.js`.
- [ ] Add `/api/v2/b2b/momentum/artists`.
- [ ] Add `/api/v2/b2b/momentum/artists/:id`.
- [ ] Persist score history in `ArtistSignalSnapshot`.
- [ ] Add real source-evidence records behind every displayed signal.
- [ ] Add saved watchlists backed by the database.
- [ ] Add server-side filtering and pagination once the dataset grows beyond the current CSV scale.
- [ ] Add Playwright screenshot checks for desktop and mobile dashboard states.

---

## Product 2: Roster & Representation Change Alerts

### Buyer

- Art advisors
- Gallery directors
- Auction specialists
- Collectors tracking specific artists
- Publications tracking market movement

### Core Promise

"Know when an artist's market context changes."

### MVP Features

- Alert feed of relationship changes:
  - Artist added to gallery roster
  - Artist removed from gallery roster
  - New exhibition detected
  - Representation type changed
  - Artist appears at stronger gallery or fair
- Watchlists:
  - Artists
  - Galleries
  - Cities
  - Career stages
- Email digest:
  - Daily
  - Weekly
  - High-severity only
- Manual review queue for low-confidence changes.

### Change Detection Logic

Compare the current scrape/enrichment output to the last known database state:

| Current Observation | Previous State | Change |
|---|---|---|
| Artist-gallery link exists now | No link before | `added` |
| Artist-gallery link missing now | Link existed before | `removed` |
| Relationship changed from shown to represented | Weaker previous value | `upgraded` |
| Gallery tier increased | Lower tier before | `upgraded` |
| Artist appears in fair/opening | No recent event | `event_added` |
| Source disappeared but no confirmation | Previous source active | `needs_review` |

### Implementation Steps

1. Create `RelationshipChange` and `Alert` tables.
2. Write a comparison script:
   - Input: latest artist-gallery CSVs and extracted JSON.
   - Load current DB relationships.
   - Detect additions, removals, and changed relationship types.
   - Store `RelationshipChange` rows.
3. Add source evidence to each change.
4. Generate alerts from changes:
   - High severity: major gallery adds artist, high-momentum artist changes gallery, closure affects roster.
   - Medium severity: new exhibition, new fair appearance, new CV milestone.
   - Low severity: weak source or needs manual review.
5. Add API endpoints:
   - `GET /api/v2/b2b/alerts`
   - `GET /api/v2/b2b/alerts/:id`
   - `POST /api/v2/b2b/alerts/:id/review`
   - `GET /api/v2/b2b/changes/relationships`
6. Add dashboard pages:
   - `/b2b/alerts`
   - `/b2b/changes`
7. Add email digest after the alert feed is working.

### MVP Acceptance Criteria

- The system can detect at least three classes of changes: added, removed, changed type.
- Every alert links to an artist, gallery, and source evidence.
- Alerts can be filtered by gallery, artist, change type, and confidence.
- Low-confidence alerts can be marked reviewed.
- A weekly digest can be generated as HTML or Markdown before email integration.

---

## Product 3: Verified Gallery Intelligence API

### Buyer

- Art SaaS companies
- Fair organizers
- Shipping, insurance, framing, and storage vendors
- Gallery consultants
- Art PR firms
- Market data companies
- Internal sales teams selling into galleries

### Core Promise

"A fresh, verified feed of galleries, artists, relationships, and status changes."

### MVP Features

- Gallery directory API.
- Gallery status and verification history.
- Artist roster and relationship API.
- Artist momentum summary by gallery.
- Change feed API.
- CSV export.
- API keys and basic usage logging.

### API Endpoints

Recommended first endpoints:

```http
GET /api/v2/b2b/galleries
GET /api/v2/b2b/galleries/:id
GET /api/v2/b2b/galleries/:id/artists
GET /api/v2/b2b/galleries/:id/verification
GET /api/v2/b2b/artists
GET /api/v2/b2b/artists/:id
GET /api/v2/b2b/relationships
GET /api/v2/b2b/changes
GET /api/v2/b2b/export/galleries.csv
GET /api/v2/b2b/export/artists.csv
```

### Response Shape

Use a consistent envelope:

```json
{
  "status": "success",
  "data": [],
  "meta": {
    "total": 0,
    "limit": 100,
    "offset": 0,
    "last_verified": "2026-05-07",
    "source_count": 0
  }
}
```

### Gallery Object

```json
{
  "id": 15,
  "name": "David Zwirner",
  "slug": "david-zwirner",
  "type": "commercial",
  "locations": ["New York", "London", "Paris", "Hong Kong", "Los Angeles"],
  "countries": ["USA", "UK", "France", "China", "USA"],
  "website": "https://www.davidzwirner.com",
  "instagram": "davidzwirner",
  "status": "active",
  "founded_year": 1993,
  "last_verified": "2026-05-07",
  "artist_count": 0,
  "verification": {
    "http_status": 200,
    "confidence": 0.95,
    "source_count": 3
  }
}
```

### Implementation Steps

1. Finish gallery enrichment priority 1:
   - Investigate the 12 unreachable websites.
   - Update `status`, `website`, and `last_verified`.
2. Add gallery Instagram handles and founding years for high-value galleries.
3. Add `GalleryVerificationSnapshot`.
4. Modify `scripts/audit_galleries.py` so it can write verification snapshots, not just print an audit.
5. Build B2B API endpoints using the existing v2 API conventions.
6. Add API key auth before exposing externally.
7. Add CSV export.
8. Add simple usage logs:
   - API key
   - endpoint
   - timestamp
   - result count

### MVP Acceptance Criteria

- All 52 initial galleries have a current `last_verified` date.
- The 12 currently unreachable galleries are resolved into active, closed, relocated, or unknown.
- API returns gallery and relationship data with pagination.
- CSV export works for galleries and artists.
- Every commercial field has at least one source or a clear confidence value.

---

## Build Order

### Phase 0: Data Hardening

Goal: make the data trustworthy enough to sell.

Tasks:

- Resolve the 12 unreachable galleries.
- Add `last_verified` to all gallery rows.
- Add Instagram handles for galleries.
- Normalize artist Instagram values into handles or canonical URLs.
- Backfill artist-gallery links from `galleries_exhibited`.
- Add source evidence for all manually verified fields.

Exit criteria:

- No blank `last_verified` values for galleries.
- Every gallery has a status.
- Every relationship has a relationship type or a default of `shown`.

### Phase 1: Verified Gallery Intelligence API

Build first because it forces clean data contracts.

Tasks:

- Add verification snapshots.
- Build gallery API endpoints.
- Build relationship API endpoints.
- Build CSV exports.
- Add API key auth.

Exit criteria:

- One external buyer could use the gallery feed without seeing the dashboard.

### Phase 2: Artist Momentum Radar

Build second because it reuses the cleaned entity graph.

Tasks:

- Extend scoring.
- Persist score snapshots.
- Build ranked artist endpoint.
- Build dashboard.
- Add CSV export.

Exit criteria:

- A user can explain why each top-ranked artist is ranked highly.

### Phase 3: Roster & Representation Change Alerts

Build third because alerts need historical baselines.

Tasks:

- Add relationship change detection.
- Add alert table.
- Add alert feed.
- Add manual review.
- Generate weekly digest.

Exit criteria:

- The system can produce a useful weekly market movement digest from local data.

### Phase 4: Commercial Packaging

Package the same platform three ways:

| Package | Buyer | Price Shape |
|---|---|---|
| Dashboard | Advisors, curators, galleries | Monthly subscription |
| Alerts | Advisors, auction specialists, collectors | Monthly subscription or per-seat |
| API/feed | Art SaaS, vendors, research teams | Usage-based or annual data license |

---

## Technical Milestones

### Milestone 1: Data Baseline

- `npm run` or script command for gallery audit writes snapshots.
- CSV import/upsert script is repeatable.
- Source evidence table exists.
- Gallery statuses are fully reviewed.

### Milestone 2: API Baseline

- B2B endpoints exist under `/api/v2/b2b`.
- Pagination and filtering work.
- API responses include verification metadata.
- CSV exports work.

### Milestone 3: Scoring Baseline

- Momentum score uses external and graph signals.
- Scores are persisted in snapshots.
- Dashboard shows ranked artists and evidence.

### Milestone 4: Alerts Baseline

- Relationship diff script runs against latest extraction data.
- Alerts are generated from relationship changes.
- Review state works.
- Weekly Markdown digest can be generated.

### Milestone 5: First Sellable Demo

Demo script:

1. Show gallery API response for a verified gallery.
2. Show an artist ranked in Momentum Radar.
3. Explain why the artist is trending.
4. Show gallery relationships and source evidence.
5. Show one relationship or gallery-status alert.
6. Export the result as CSV.

---

## Suggested Repo Additions

Recommended new files:

```text
scripts/import-consolidated-csvs.js
scripts/write-gallery-verification-snapshots.py
scripts/detect-relationship-changes.js
scripts/generate-b2b-alerts.js
scripts/generate-weekly-market-digest.js

pages/api/v2/b2b/galleries/index.js
pages/api/v2/b2b/galleries/[id].js
pages/api/v2/b2b/galleries/[id]/artists.js
pages/api/v2/b2b/artists/index.js
pages/api/v2/b2b/artists/[id].js
pages/api/v2/b2b/momentum/artists.js
pages/api/v2/b2b/alerts/index.js
pages/api/v2/b2b/changes/relationships.js
pages/api/v2/b2b/export/galleries.csv.js
pages/api/v2/b2b/export/artists.csv.js

pages/b2b/momentum.js
pages/b2b/alerts.js
pages/b2b/galleries.js
pages/b2b/artists/[id].js
pages/b2b/galleries/[id].js
```

---

## Ranking The Next 7 By Fit With The First 3

These are ranked by how well they reuse the same data, workflows, buyers, and distribution channels as Artist Momentum Radar, Roster Alerts, and Verified Gallery Intelligence API.

| Fit Rank | Product | Why It Fits | Build Timing |
|---:|---|---|---|
| 1 | **Gallery Closure, Relocation & Health Monitor** | Direct extension of gallery verification snapshots and alerting. The current audit already found unreachable gallery websites, so the workflow exists. | Build immediately after Gallery API |
| 2 | **Gallery Digital Health Benchmark** | Reuses website audits, Instagram enrichment, last verified dates, artist roster clarity, and source confidence. Easy dashboard upsell for galleries and consultants. | Build after gallery verification is stable |
| 3 | **Art Fair & Exhibition Opportunity Tracker** | Feeds artist momentum and alerts with strong market signals: fair participation, upcoming shows, opening dates, and gallery activity. | Build once events are structured |
| 4 | **Art Market Data Feed for AI/Search Products** | Mostly a packaging layer on the API. Strong fit with the Verified Gallery Intelligence API, but it needs cleaner docs, usage limits, and licensing. | Build after first API customers |
| 5 | **Artist Due Diligence & CV Parser** | Improves Momentum Radar quality by extracting solo shows, group shows, institutions, education, collections, and awards. Useful, but parsing takes extra implementation work. | Build after artist ranking has users |
| 6 | **Collector Outreach Trigger Engine** | Uses momentum and alert signals, but depends on CRM/email integrations and buyer-specific workflows. Best as an integration layer, not an early core product. | Build after alerts prove valuable |
| 7 | **Artist-Gallery Fit & Prospecting Tool** | Uses the graph, but shifts toward artists/studios as buyers and requires recommendation logic. Good later, but less aligned with the initial B2B intelligence wedge. | Build last among these seven |

### Best Next Add-On

The best fourth product is **Gallery Closure, Relocation & Health Monitor**.

Reason:

- It is already latent in `scripts/audit_galleries.py`.
- It uses the same `status`, `website`, and `last_verified` fields.
- It produces alerts naturally.
- It strengthens the API's freshness story.
- It is valuable to vendors selling into galleries because bad contact data wastes sales effort.

### Best Fifth Product

The best fifth product is **Gallery Digital Health Benchmark**.

Reason:

- It turns verification data into a score.
- It gives galleries a reason to care about their own record.
- It can become a lead-generation wedge for selling dashboard access, enrichment, or consulting.

### Best Product To Delay

Delay **Artist-Gallery Fit & Prospecting Tool**.

Reason:

- It is attractive, but it pulls the product toward artist-facing sales.
- It needs enough historical relationship data to make recommendations credible.
- It could be powerful once the first three products produce a clean graph and enough change history.

---

## Practical MVP Scope

The first sellable version should avoid boiling the ocean.

Build only:

- 52 verified galleries.
- 250 to 500 artists.
- Relationship graph from current CSVs.
- One momentum leaderboard.
- One gallery API.
- One alert feed.
- CSV export.
- Manual review for low-confidence changes.

Do not build yet:

- Full CRM.
- Marketplace transactions.
- Public artist discovery marketplace.
- Automated paid newsletters.
- Sophisticated valuation model.
- Recommendation engine.

The first paid product should be a research and intelligence workflow, not a replacement for Artlogic, ArtCloud, Artsy, or a gallery inventory system.

---

## One-Sentence Positioning

ZXY B2B is a verified art-market intelligence layer that tracks artist momentum, gallery roster changes, and gallery data freshness for businesses that need current art-world signals.
