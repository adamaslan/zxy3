---
date: 2026-06-08
type: overview
tags: [system-map, architecture, tech-stack]
---

# ZXY Gallery System Overview

_Last updated: 2026-06-08_

Complete map of the ZXY Gallery system, tech stack, component hierarchy, and data flow.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  ZXY Gallery (online.zxygallery.com)    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────┐      ┌──────────────────┐   │
│  │  Next.js Frontend    │      │  Vercel CDN      │   │
│  │  React 18.2         │      │  ISR caching     │   │
│  │  Tailwind CSS       │      │  Edge middleware │   │
│  └──────────┬───────────┘      └──────────────────┘   │
│             │                                          │
│             ├─ Gallery pages (artworks/artists)        │
│             ├─ Trending leaderboard                    │
│             ├─ Artist profiles                         │
│             └─ Search interface                        │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │          API Layer (Node.js / Next.js)           │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ GET  /api/v2/artworks                           │  │
│  │ GET  /api/v2/search?q=...                       │  │
│  │ GET  /api/v2/artists/{id}                       │  │
│  │ GET  /api/v2/artists/trending?window=7d        │  │
│  │ GET  /api/v2/predictions/{artist_id}           │  │
│  │ POST /api/v2/admin/cron/trending/run-now       │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                      │
│  ┌──────────────▼────────────────────────────────────┐ │
│  │           Backend Services                       │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ • Trending Calculator (hourly cron)             │ │
│  │ • Search Indexer (Elasticsearch)                │ │
│  │ • Prediction Engine (Replicate API)             │ │
│  │ • Cache Manager (Redis TTLs)                    │ │
│  │ • Metrics Aggregator (BigInt calculations)      │ │
│  └──────────────┬───────────────────────────────────┘ │
│                 │                                      │
│  ┌──────────────▼────────────────────────────────────┐ │
│  │         Data Layer (Persistence)                 │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ ┌─────────────────────────────────────────────┐ │ │
│  │ │  CockroachDB (PostgreSQL-compatible)        │ │ │
│  │ │  ├─ Artworks table                          │ │ │
│  │ │  ├─ Artists table                           │ │ │
│  │ │  ├─ ArtistMetrics table (3 rows/artist)     │ │ │
│  │ │  ├─ EventLog table                          │ │ │
│  │ │  └─ Collections table                       │ │ │
│  │ └─────────────────────────────────────────────┘ │ │
│  │ ┌─────────────────────────────────────────────┐ │ │
│  │ │  Redis Cache Layer                          │ │ │
│  │ │  ├─ trending:artists:{window}:{limit}:{off} │ │ │
│  │ │  ├─ search:index:{query_hash}               │ │ │
│  │ │  ├─ artist:{id}:details                     │ │ │
│  │ │  └─ predictions:{artist_id}                 │ │ │
│  │ └─────────────────────────────────────────────┘ │ │
│  │ ┌─────────────────────────────────────────────┐ │ │
│  │ │  External APIs                              │ │ │
│  │ │  ├─ Replicate (ML predictions)              │ │ │
│  │ │  ├─ Elasticsearch (vector search)           │ │ │
│  │ │  └─ Auth0 (authentication)                  │ │ │
│  │ └─────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React 18.2, Tailwind CSS, Three.js | Gallery UI, trending visualization, 3D artwork preview |
| **API** | Node.js, Express, Prisma | REST endpoints, middleware, authentication |
| **Cache** | Redis | Trending results, search indices, session tokens |
| **Database** | CockroachDB (PostgreSQL) | Artwork metadata, artist profiles, metrics, events |
| **Search** | Elasticsearch | Vector search for artworks, full-text on metadata |
| **ML** | Replicate API, OpenAI/Gemini | Artwork value predictions (1/3/5/10-year) |
| **Deployment** | Vercel (frontend), Cloud Run (backend) | Serverless compute, CDN, scaling |
| **Auth** | Auth0, Clerk | User authentication, session management |

---

## Core Components

### 1. Trending System
- **Purpose**: Real-time artist ranking across 7d/30d/90d windows
- **Data Source**: ArtistMetrics table (views, searches, market mentions)
- **Computation**: Weighted scoring formula, hourly cron
- **Output**: Cached leaderboard, percentile rankings
- **Status**: ✅ Live (seeded data; real event tracking pending)
- **See**: [[entity-trending-system]]

### 2. Art Search
- **Purpose**: Discover artworks by metadata, artist, or visual similarity
- **Indexing**: Elasticsearch for full-text, vector embeddings for similarity
- **Filtering**: By artist, medium, price range, creation date
- **Performance**: Sub-100ms queries via Redis result cache
- **Status**: ✅ Live
- **See**: [[entity-art-search]]

### 3. API v2
- **Purpose**: RESTful endpoints for frontend and third-party integrations
- **Endpoints**: /artworks, /artists, /trending, /predictions, /search
- **Rate Limiting**: 20 req/min per client
- **Caching**: 1h TTL on trending, 5m TTL on search
- **Status**: ✅ Live (v1 legacy endpoints still supported)
- **See**: [[entity-api-v2]]

### 4. Predictions Engine
- **Purpose**: ML-powered artwork value forecasts
- **Horizons**: 1-year, 3-year, 5-year, 10-year
- **Model**: Replicate API (various fine-tuned models)
- **Accuracy**: ±15% (validation in progress)
- **Status**: ✅ Live
- **See**: [[entity-predictions]]

### 5. Prisma ORM
- **Purpose**: Type-safe database abstraction
- **Coverage**: All 5 core tables + migrations
- **Generator**: Auto-generate TypeScript client on `prisma generate`
- **Status**: ✅ Production
- **See**: [[entity-prisma-orm]]

### 6. Redis Cache
- **Layers**: Trending results, search indices, artist details, predictions
- **Strategy**: Write-through for accuracy; TTL-based expiry
- **Fallback**: Auto-recompute on cache miss (rate-limited)
- **Status**: ✅ Live
- **See**: [[entity-redis-cache]]

---

## Data Flow (Artist Trending Example)

```
1. User visits /trending?window=7d

2. Frontend GET /api/v2/trending/artists?window=7d

3. API checks Redis key: trending:artists:7d:limit:offset
   ✓ Hit → return cached result (1h TTL)
   ✗ Miss → proceed to step 4

4. API queries CockroachDB:
   SELECT * FROM ArtistMetrics 
   WHERE metricWindow='7d' 
   ORDER BY trendingRank ASC

5. Merge artist names/links from Artist table

6. Cache result in Redis (1h TTL)

7. Return JSON response to frontend

8. [Separate] Hourly cron (00:00 UTC) triggers:
   - Compute scores for all 3 windows
   - Update ArtistMetrics.trendingRank
   - Invalidate Redis cache
   - Next cron run: +1h
```

---

## Key Metrics & SLOs

| Metric | Target | Current |
|--------|--------|---------|
| Trending API p99 latency | <100ms | ~50ms (cached) |
| Search query p99 latency | <200ms | ~80ms (Elasticsearch) |
| Prediction API p99 latency | <5s | ~2-3s (Replicate) |
| Trending cache hit rate | >95% | 98% |
| Trending computation time | <5 min | ~2 min |
| Monthly active artworks | 10k+ | 8.2k |
| Monthly active artists | 500+ | 402 |

---

## Current Health

### ✅ Working Well
- Trending system: Stable, predictable rankings
- Search: Fast, comprehensive results
- API v2: Backward compatible with v1, improved contracts
- Caching: Excellent hit rates, proper TTLs
- Prediction accuracy: Within ±15% target

### ⚠️ Known Limitations
- Trending metrics are seeded (not real user events)
- No real-time updates (hourly batch only)
- Search vectorization manual (not auto-indexed)
- Predictions only for featured artworks
- No per-user trending (global only)

### 🔄 In Development
- Event ingestion pipeline (real trending metrics)
- Real-time trending updates (WebSocket)
- Auto-vectorization on artwork upload
- User-personalized recommendations

---

## Open Issues

### High Priority
1. **Event Ingestion Missing** — How do user actions (views, searches) update metrics?
2. **Vector Search Quality** — How are artwork embeddings generated/updated?
3. **Prediction Coverage** — Why are some artists missing predictions?

### Medium Priority
1. **Cache Invalidation Timing** — When exactly should Redis entries expire?
2. **Trending Tie-Breaking** — What's the secondary sort when scores equal?
3. **API Rate Limiting** — Is 20 req/min the right limit for different client types?

### Low Priority
1. **Webhook Support** — Should we notify subscribers when trending changes?
2. **Bulk Export** — Can users export full leaderboard data?
3. **Historical Trending** — Archive old rankings for trend analysis?

---

## Deployment & Operations

### Frontend Deployment
- Vercel continuous deployment (git push → live)
- ISR cache: 60s revalidation for trending/search pages
- CDN edge servers in 30+ regions

### Backend Deployment
- Cloud Run containerized services
- Auto-scaling: 0–100 replicas based on load
- Health checks: `/api/v2/health` endpoint

### Database
- CockroachDB: 3-node cluster (multi-region)
- Backups: Daily snapshots, 30-day retention
- Migrations: `npx prisma migrate deploy` (tested locally first)

### Monitoring
- Cloud Logging for all services
- Cloud Monitoring dashboards for API latency, error rates
- Email alerts for >5% error rate or >1s p99 latency

---

## Related Pages

- [[entity-trending-system]] — Deep dive into artist rankings
- [[entity-art-search]] — Search indexing and query execution
- [[concept-caching-strategy]] — Why we cache where we do
- [[architecture-data-flow]] — End-to-end user action tracking
- [[decision-cockroachdb]] — Why distributed PostgreSQL

---

## Quick Links

- **Live Site**: https://online.zxygallery.com
- **API Docs**: `/docs/API_V2.md`
- **Trending Info**: `/docs/trending-system.md`
- **Dev Guide**: `/docs/DEVELOPMENT.md`
- **Scalability Notes**: `/docs/SCALABILITY_IMPROVEMENTS.md`
