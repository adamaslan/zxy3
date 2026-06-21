# ZXY Gallery Architecture Overview

**Source**: Extracted from `docs/` folder (API_V2.md, trending-system.md, DEVELOPMENT.md, SCALABILITY_IMPROVEMENTS.md)  
**Date**: 2026-06-08  
**Status**: Immutable reference document (read-only)

---

## Quick Summary

ZXY Gallery is a modern artwork discovery platform built on:
- **Frontend**: Next.js 14 with React 18, deployed on Vercel with ISR
- **Backend**: Node.js API with Prisma ORM, deployed on Cloud Run
- **Database**: CockroachDB (PostgreSQL-compatible) for data persistence
- **Cache**: Redis for trending results, search indices, predictions
- **Features**: Artwork search, artist profiles, trending leaderboards, value predictions

---

## Core Components

### 1. Artwork Discovery (Art Search)
- Full-text search via Elasticsearch
- Vector similarity search for visual matching
- Filtering by artist, medium, price range, date
- Sub-100ms queries with Redis result caching

### 2. Artist Trending (Leaderboard)
- Real-time rankings across 7d/30d/90d windows
- Weighted scoring: views (50%) + searches (30%) + mentions (20%)
- Hourly cron computation, cached results (1h TTL)
- Currently seeded with fake data; real event ingestion pending

### 3. Artwork Predictions
- ML-powered value forecasts (1/3/5/10-year horizons)
- Accuracy target: ±15%
- Uses Replicate API for inference
- Cached for 24 hours

### 4. REST API (v2)
Endpoints:
- `GET /api/v2/artworks` — List artworks
- `GET /api/v2/search?q=...` — Search artworks/artists
- `GET /api/v2/artists/{id}` — Artist profile
- `GET /api/v2/artists/trending?window=7d` — Leaderboard
- `GET /api/v2/predictions/{artist_id}` — Value predictions
- `POST /api/v2/admin/cron/trending/*` — Admin controls (protected)

Rate limited: 20 req/min per client

---

## Data Model

### Core Tables (Prisma)

```prisma
model Artwork {
  id String @id
  title String
  artistId BigInt
  description String?
  imageUrl String
  price Decimal?
  createdAt DateTime
  updatedAt DateTime
  
  artist Artist @relation(fields: [artistId], references: [id])
  @@index([artistId])
}

model Artist {
  id BigInt @id @default(autoincrement())
  name String
  bio String?
  portfolioUrl String?
  instagramHandle String?
  createdAt DateTime
  
  artworks Artwork[]
  metrics ArtistMetrics[]
  @@unique([instagramHandle])
}

model ArtistMetrics {
  artistId BigInt
  metricWindow String // "7d", "30d", "90d"
  viewCount BigInt
  searchFrequency BigInt
  marketMentions BigInt
  trendingRank BigInt?
  computedAt DateTime
  
  artist Artist @relation(fields: [artistId], references: [id])
  @@id([artistId, metricWindow])
}

model EventLog {
  id String @id
  userId String?
  eventType String // "view", "search", "mention"
  targetId String
  createdAt DateTime
  metadata Json?
  
  @@index([createdAt])
  @@index([eventType])
}
```

---

## API Contracts

### GET /api/v2/artworks

```json
{
  "artworks": [
    {
      "id": "art-123",
      "title": "Ocean at Sunset",
      "artistId": 1,
      "description": "Oil on canvas",
      "imageUrl": "https://...",
      "price": 5000.00,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 8234,
  "page": 1,
  "limit": 20
}
```

### GET /api/v2/artists/trending?window=7d

```json
{
  "artists": [
    {
      "rank": 1,
      "artistId": 42,
      "name": "Alice Chen",
      "trendScore": 85.5,
      "percentile": 99.5,
      "metrics": {
        "viewCount": 1000,
        "searchFrequency": 500,
        "marketMentions": 200
      },
      "portfolioUrl": "https://alicechen.com",
      "instagramHandle": "@alicechen"
    }
  ],
  "total": 67,
  "window": "7d",
  "timestamp": "2026-06-08T17:00:00Z"
}
```

### GET /api/v2/predictions/{artist_id}

```json
{
  "artistId": 42,
  "predictions": [
    { "horizon": "1y", "low": 4500, "mid": 5000, "high": 5500 },
    { "horizon": "3y", "low": 5000, "mid": 6000, "high": 7000 },
    { "horizon": "5y", "low": 6000, "mid": 8000, "high": 10000 },
    { "horizon": "10y", "low": 8000, "mid": 12000, "high": 15000 }
  ],
  "modelVersion": "v2.1",
  "generatedAt": "2026-06-07T00:00:00Z"
}
```

---

## Caching Strategy

### Layer 1: Redis (Distributed)
- Trending results: `trending:artists:{window}:{limit}:{offset}` (1h TTL)
- Search results: `search:index:{query_hash}` (5m TTL)
- Artist details: `artist:{id}:details` (15m TTL)
- Predictions: `predictions:{artist_id}` (24h TTL)

### Layer 2: Prisma Query Cache (Request-scoped)
- Automatic within single request
- Deduplicates repeated queries

### Layer 3: Application Memory
- Session tokens (in-process)
- User preferences

---

## Deployment

### Frontend (Vercel)
- Next.js 14 with ISR caching
- 60s revalidation for trending/search pages
- Automatic deployments on git push
- CDN edge servers in 30+ regions

### Backend (Cloud Run)
- Containerized Node.js service
- 0–100 auto-scaling replicas
- Health checks: `/api/v2/health`
- Cloud Logging integration

### Database (CockroachDB)
- 3-node cluster (multi-region)
- Daily snapshots, 30-day retention
- Backups to Cloud Storage

---

## Known Limitations

1. **Trending metrics are seeded** — No real user event ingestion yet
2. **No real-time updates** — Hourly batch only
3. **Search vectorization manual** — Not auto-indexed on upload
4. **Predictions limited** — Only featured artworks
5. **No per-user trending** — Global rankings only

---

## Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Trending API p99 | <100ms | ~50ms (cached) |
| Search p99 | <200ms | ~80ms (Elasticsearch) |
| Predictions p99 | <5s | ~2-3s (Replicate) |
| Cache hit rate | >95% | 98% (trending) |

---

## References

- Full API docs: `docs/API_V2.md`
- Trending deep dive: `docs/trending-system.md`
- Scalability guide: `docs/SCALABILITY_IMPROVEMENTS.md`
- Development setup: `docs/DEVELOPMENT.md`
- Modernization roadmap: `plans/zxy-modernization-roadmap.md`
