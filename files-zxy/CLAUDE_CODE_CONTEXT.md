# CLAUDE_CODE_CONTEXT.md
# Read this before touching anything in this repo.

## What This Repo Is
Next.js app (pages router) + Prisma + CockroachDB.
It's an art world database platform tracking artists, galleries, museums, and artworks
sourced initially from internationalartmagazine.com.

## Current State (Before These New Files)
- `prisma/schema.prisma` — has legacy `mytable` only: id | artist | medium1 | medium2 | price_range
- `prisma/globalprisma.js` — Prisma singleton (dev: reuse across hot reloads, prod: fresh instance)
- `pages/api/artworks.js` — fetches ALL records from mytable, returns JSON
- `pages/api/search.js` — server-side DB filter exists but NOT wired to any component
- `components/db-magic.js` — `<ArtworkTable />` auto-fetches on mount, shows all records
- `components/ds-magic2.js` — `<ArtworkSearchTable />` fetches all then filters CLIENT-SIDE (inefficient)
- `pages/about-artists.js` — uses ArtworkTable
- `pages/pastshows.js` — uses ArtworkSearchTable

## What the New Files Do

### `prisma/schema.prisma` (REPLACE existing)
Adds full v2 schema alongside legacy mytable:
- Artist: id, name, slug, bio, nationality, comprehend_tags (AI tags), etc.
- Artwork: id, artist_id, medium, price_range, image_url, rekognition_labels, dominant_colors, etc.
- Gallery: id, name, slug, city, country, type (commercial/non-profit/museum/art_fair)
- ArtistGallery: many-to-many join table
- ArtistMetrics: search_hits, profile_views per artist
Keep mytable in place — do not remove it until migration is confirmed working.

### `prisma/seed.js` (NEW FILE)
Populates v2 schema with 100 records scraped from internationalartmagazine.com:
- 49 artists (Magnus Maxine Flowers → Marco Santini)
- 36 galleries (King's Leap → Honey Ramka)
- 15 museums & institutions (MoMA → Felix Art Show)
Run with: `npx prisma db seed`
Uses upsert — safe to run multiple times.

### `pages/api/artworks.js` (REPLACE existing)
Now queries v2 Artist+Artwork tables with full relational data.
Falls back to legacy mytable automatically if v2 is empty.
Still serializes BigInt → string for JSON safety.

### `pages/api/search.js` (REPLACE existing)
Now fully wired and functional. Server-side filtering via Prisma.
Supports: ?q=query&type=artist|gallery|museum|all
Also supports legacy ?searchDB= param for backward compatibility.
Falls back to mytable if v2 returns nothing.
FIX NEEDED: Update ArtworkSearchTable in components/ds-magic2.js to call
  fetch(`/api/search?q=${encodeURIComponent(query)}`)
instead of fetch('/api/artworks') to stop client-side filtering.

### `lambda/enrichArtist.js` (NEW DIRECTORY + FILE)
AWS Lambda function triggered by EventBridge when a new Artist is inserted.
Calls:
- Gemini 1.5 Flash API → generates bio (if missing), extracts art tags
- Google Cloud Vision API → analyzes artwork images for labels + dominant colors
Writes results back to CockroachDB via Prisma.
Requires env vars: GEMINI_API_KEY, GOOGLE_VISION_API_KEY

## Environment Variables Needed
Add to .env (never commit):
```
DATABASE_URL=          # already exists - CockroachDB connection string
GEMINI_API_KEY=        # Google AI Studio - free tier
GOOGLE_VISION_API_KEY= # Google Cloud Console - free tier
```

## Migration Steps (Run In This Order)
```bash
# 1. Replace schema
cp prisma/schema.prisma prisma/schema.prisma.backup
# (paste new schema.prisma)

# 2. Generate Prisma client
npx prisma generate

# 3. Push schema to CockroachDB (creates new tables, keeps mytable)
npx prisma db push

# 4. Seed the 100 records
npx prisma db seed

# 5. Verify in Prisma Studio
npx prisma studio

# 6. Replace API routes
# (paste new artworks.js and search.js into pages/api/)

# 7. Fix ArtworkSearchTable to use server-side search
# In components/ds-magic2.js, change fetch('/api/artworks') → fetch(`/api/search?q=${query}`)
```

## 3-Layer Pipeline Architecture

```
LAYER 1 — CockroachDB (source of truth, free forever up to 5GB)
  Artist + Artwork + Gallery + ArtistGallery + ArtistMetrics

LAYER 2 — Enrichment (runs async after insert)
  EventBridge → Lambda (enrichArtist.js)
    → Gemini 1.5 Flash: bio generation + tag extraction
    → Google Cloud Vision: image label + color detection
    → Results written back to Artist.comprehend_tags, Artwork.rekognition_labels
  DynamoDB: caches price_prediction + trajectory_score + similar_artists

LAYER 3 — Analytics & Prediction
  Nightly Lambda: exports CockroachDB → CSV → Cloudflare R2
  Athena: SQL queries on snapshots (trend analysis, gallery rankings)
  QuickSight: dashboards (medium trends, price distributions, geography)
  SageMaker Studio Lab: price range predictor + artist trajectory scorer
```

## Key Design Decisions
- Cloudflare R2 (not S3) for image storage — free forever, S3-compatible API
- Gemini 1.5 Flash (not AWS Comprehend/Bedrock) — free forever at this scale
- Google Cloud Vision (not AWS Rekognition) — free forever at 1000 images/month
- DynamoDB for caching only — never primary storage
- legacy mytable stays until all components are confirmed on v2

## Files NOT to Touch
- `prisma/globalprisma.js` — singleton is fine as-is
- Any component files until API routes are confirmed working
- `.env` — never modify DATABASE_URL format
