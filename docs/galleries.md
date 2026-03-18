# Artists API — Full Stack Overview

## Architecture Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS INFRASTRUCTURE                          │
│                                                                     │
│  EventBridge ──────────► Lambda: enrichArtist (Node 20.x, 256MB)   │
│  (artist created/updated)         │                                 │
│                                   ├──► Google Gemini API            │
│                                   │    (bio generation + tags)      │
│                                   │                                 │
│                                   └──► Google Vision API            │
│                                        (image labels + colors)      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │ Prisma writes
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           COCKROACHDB                               │
│                                                                     │
│  Artist                    Artwork                  ArtistMetrics   │
│  ──────────────────        ─────────────────────    ─────────────── │
│  id (BigInt PK)            id (BigInt PK)           id              │
│  name                      artistId (FK)            artistId (FK)   │
│  slug (unique)             imageUrl                 window (7d/30d) │
│  bio                       medium                   viewCount       │
│  bio_generated             price_range              searchFrequency │
│  comprehend_tags[]         rekognition_labels       marketMentions  │
│  comprehend_ran            dominant_colors[]        trendingRank    │
│  website / instagram       rek_ran                  computedAt      │
│  nationality / birth_year                                           │
│  active                    ArtistGallery (junction)                 │
│  createdAt / updatedAt     ─────────────────────                    │
│  artworks []               artistId / galleryId                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ Prisma reads
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS API LAYER                             │
│                                                                     │
│  /api/v2/artists                /api/v2/trending/artists            │
│  ─────────────────────────      ─────────────────────────────────   │
│  GET ?search=                   GET ?window=7d|30d|90d              │
│      &careerStage=              Rate limit: 20 req/min              │
│      &orderBy=                  Cache TTL: 1 hour (Redis)           │
│      &limit= &offset=                                               │
│  Rate limit: 60 req/min         /api/v2/artists/[id]                │
│  Cache TTL: 24 hours (Redis)    ─────────────────────               │
│                                 GET single artist by id             │
│                                 Cache TTL: 24 hours                 │
│                                                                     │
│  Middleware Stack:                                                   │
│    withRateLimit ──► withRedisCache ──► handler                     │
│                            │                                        │
│                      Redis (primary)                                │
│                      In-memory (fallback)                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │ fetch()
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS PAGES                                 │
│                                                                     │
│  /posts/artists                 /trending                           │
│  ──────────────────────         ────────────────────────────────    │
│  Artist grid (24/page)          Full leaderboard                    │
│  Search (350ms debounce)        Tab: 7d / 30d / 90d                 │
│  Career stage filter            Stats dashboard                     │
│  Trending sidebar (top 10)      RankBadge / ScoreDisplay            │
│  getServerSideProps (SSR)       MetricsBar visualization            │
└─────────────────────────────────────────────────────────────────────┘
```

## Trending Score Algorithm

```
trendScore = (viewCount × 0.50)
           + (searchFrequency × 0.30)
           + (marketMentions × 0.20)

Then normalized to 0–100 across all artists.
Windows: 7d · 30d · 90d  (recomputed hourly via cron)
```

## Career Stage Tags

Exactly one of the following is extracted per artist by the Lambda:

| Tag | Description |
|-----|-------------|
| `emerging artist` | Early career, building reputation |
| `mid-career artist` | Established practice, growing recognition |
| `established artist` | Widely recognized, strong market presence |
| `late-career artist` | Historically significant body of work |

## Data Flow Summary

```
Artist Created
    │
    ├─► EventBridge ─► Lambda (enrichArtist)
    │       ├─► Gemini: bio + career stage tag
    │       └─► Vision: image labels + dominant colors
    │
    ├─► CockroachDB updated with enrichment data
    │
    └─► Hourly Cron ─► Trending computation (all windows)
            └─► ArtistMetrics.trendingRank updated

User Request
    │
    └─► Next.js API route
            ├─► Rate limit check (sliding window, per IP)
            ├─► Redis cache hit? ─► return cached response
            └─► Cache miss ─► Prisma query ─► cache + respond
```

## File Map

| Layer | File |
|-------|------|
| Terraform | `terraform/main.tf` |
| Lambda | `lambda/enrichArtist.js` |
| DB Schema | `prisma/schema.prisma` |
| API — list artists | `pages/api/v2/artists/index.js` |
| API — single artist | `pages/api/v2/artists/[id].js` |
| API — trending | `pages/api/v2/trending/artists.js` |
| Page — artists | `pages/posts/artists.js` |
| Page — trending | `pages/trending.js` |
| Lib — scorer | `lib/trending/scorer.js` |
| Lib — calculator | `lib/trending/calculator.js` |
| Lib — validators | `lib/api/validators.js` |
| Lib — handlers | `lib/api/handlers.js` |
| Middleware — cache | `lib/middleware/redisCache.js` |
| Middleware — rate limit | `lib/middleware/rateLimit.js` |
| Cron | `lib/cron/trendingCron.js` |
| Manual script | `scripts/run-trending-ranks.js` |
| Build | `Makefile` |
