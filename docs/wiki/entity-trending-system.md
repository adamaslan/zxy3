---
date: 2026-06-08
type: entity
tags: [trending, ranking, metrics, cron, redis, database]
---

# entity-trending-system

Real-time artist ranking across 3 time windows (7d/30d/90d), updated hourly via cron.

---

## Overview

The trending system tracks artist engagement (profile views, search frequency, market mentions) and computes hourly rankings. Results are cached in Redis and served via a public API. Powers the trending leaderboard on the website.

**Where it lives**:
- Core logic: `lib/trending/`
- Database table: `ArtistMetrics` (Prisma schema)
- API endpoint: `/api/v2/trending/artists`
- Admin endpoints: `/api/v2/admin/cron/trending/*`
- Cron scheduler: `lib/cron/trendingCron.js`
- Scripts: `npm run trending` (manual runner)

**Who uses it**:
- Frontend: `/trending` page (full leaderboard)
- Frontend: `/posts/artists.js` (sidebar top 10)
- Third-party API clients (rate-limited)

---

## Public Interface

### GET /api/v2/trending/artists

Fetch trending artists for a given window.

**Query Parameters**:
- `window` (string): "7d" | "30d" | "90d" (required)
- `limit` (number): 1–1000, default 100
- `offset` (number): pagination offset, default 0

**Response** (200 OK):
```json
{
  "artists": [
    {
      "rank": 1,
      "artistId": "artist-123",
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
    },
    // ... up to limit
  ],
  "total": 67,
  "window": "7d",
  "timestamp": "2026-06-08T17:00:00Z"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Invalid window. Must be '7d', '30d', or '90d'"
}
```

**Caching**: Redis, TTL 1h, key pattern `trending:artists:{window}:{limit}:{offset}`
**Rate Limit**: 20 req/min per client IP
**Performance**: <100ms p99 (when cached)

---

### Admin Endpoints

All protected by `withAdminAuth` middleware (Bearer token required).

#### POST /api/v2/admin/cron/trending/start
Start the hourly cron job.

**Response** (200 OK):
```json
{
  "status": "started",
  "nextRun": "2026-06-08T18:00:00Z",
  "schedule": "0 * * * *"
}
```

#### POST /api/v2/admin/cron/trending/stop
Stop the hourly cron job.

**Response** (200 OK):
```json
{
  "status": "stopped"
}
```

#### GET /api/v2/admin/cron/trending/status
Check if cron is running and when the next run is scheduled.

**Response** (200 OK):
```json
{
  "running": true,
  "nextRun": "2026-06-08T18:00:00Z",
  "lastRun": "2026-06-08T17:00:00Z",
  "lastDuration": "145ms"
}
```

#### POST /api/v2/admin/cron/trending/run-now
Trigger trending computation immediately (bypasses schedule).

**Response** (202 Accepted):
```json
{
  "status": "computing",
  "requestId": "req-12345"
}
```

---

## Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| Prisma ORM | Library | Database queries, type-safe client |
| CockroachDB | Database | Persistence (ArtistMetrics table) |
| Redis | Cache | Result caching (1h TTL) |
| node-cron | Library | Hourly scheduler |
| next/server | Framework | API route handlers |

---

## Implementation Details

### Data Model: ArtistMetrics Table

```prisma
model ArtistMetrics {
  artistId       BigInt     // FK to Artist.id
  metricWindow   String     // "7d", "30d", "90d" — composite PK
  viewCount      BigInt     // Profile views
  searchFrequency BigInt    // Search hits
  marketMentions BigInt     // External mentions
  trendingRank   BigInt?    // Rank within window after computation
  computedAt     DateTime   // Timestamp of last computation
  
  @@id([artistId, metricWindow])
  @@index([trendingRank, metricWindow]) // For sorting
}
```

**Data source**: Currently seeded with random `randomInt()` values in `prisma/seed.js`. Real event ingestion pipeline is **not yet implemented** (see [[concept-event-flow]]).

### Scoring Algorithm

```javascript
// lib/trending/scorer.js
function scoreArtist(metrics) {
  const trendScore = 
    (metrics.viewCount * 0.5) +
    (metrics.searchFrequency * 0.3) +
    (metrics.marketMentions * 0.2);
  
  return trendScore;
}
```

**Weights**:
- Views: 50% (most important — user engagement)
- Searches: 30% — (discoverability)
- Mentions: 20% — (external validation)

### Computation Pipeline

```javascript
// lib/trending/calculator.js

async function computeTrendingForWindow(prisma, window) {
  // 1. Fetch all metrics for window
  const metrics = await prisma.artistMetrics.findMany({
    where: { metricWindow: window }
  });
  
  // 2. Score each artist
  const scored = metrics.map(m => ({
    ...m,
    score: scoreArtist(m)
  }));
  
  // 3. Rank descending by score
  const ranked = scored.sort((a, b) => b.score - a.score);
  
  // 4. Calculate percentiles
  const withPercentiles = ranked.map((r, i) => ({
    ...r,
    rank: i + 1,
    percentile: ((i + 1) / ranked.length) * 100
  }));
  
  return withPercentiles;
}

async function updateTrendingRanks(prisma, window, ranked) {
  // Write ranks back to database
  for (const artist of ranked) {
    await prisma.artistMetrics.update({
      where: { artistId_metricWindow: { artistId, metricWindow: window } },
      data: { trendingRank: artist.rank, computedAt: new Date() }
    });
  }
}
```

### Cron Scheduler

```javascript
// lib/cron/trendingCron.js

const cron = require('node-cron');

let trendingCronJob = null;

function startTrendingCron(prisma) {
  // Run at top of every hour: 0 * * * *
  trendingCronJob = cron.schedule('0 * * * *', async () => {
    console.log('[Trending Cron] Computing rankings...');
    const start = Date.now();
    
    try {
      await computeAllTrending(prisma);
      const duration = Date.now() - start;
      console.log(`[Trending Cron] Complete (${duration}ms)`);
    } catch (err) {
      console.error('[Trending Cron] Failed:', err);
    }
  });
}

function stopTrendingCron() {
  if (trendingCronJob) {
    trendingCronJob.stop();
    trendingCronJob = null;
  }
}
```

**Note**: Cron is **not auto-started** on server boot. Must be explicitly started via `/api/v2/admin/cron/trending/start` or `npm run trending`.

### Redis Caching

```javascript
// Pseudocode for caching strategy
const cacheKey = `trending:artists:${window}:${limit}:${offset}`;

// On GET request:
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached); // Cache hit
}

// Cache miss: recompute
const results = await getTrendingArtists(prisma, window, limit, offset);
await redis.setex(cacheKey, 3600, JSON.stringify(results)); // 1h TTL
return results;
```

**Cache invalidation**: Automatic via TTL expiry (1h). Manual invalidation not yet implemented.

---

## Testing

### Unit Tests
- Scoring formula: test weights, edge cases (zero values, BigInt overflow)
- Ranking: test sort order, percentile calculation
- Window isolation: confirm 7d/30d/90d don't interfere

### Integration Tests
- Full pipeline: seed data → compute → fetch via API → validate cache
- Admin endpoints: start/stop cron, run-now, status
- Rate limiting: confirm 20 req/min enforcement

### Known Gaps
- No e2e test for seeded data quality
- No performance benchmarks for 10k+ artists
- No load test for concurrent API requests

---

## Known Issues & Todos

### 🔴 High Priority
1. **Metrics are fake** — `ArtistMetrics` is seeded with `randomInt()`, not real user events
   - Fix: Implement event ingestion pipeline (see [[concept-event-flow]])
   - Impact: Rankings are meaningless to users; site looks broken

2. **Cron doesn't auto-start** — If backend restarts, rankings stop updating
   - Fix: Add `startTrendingCron()` to server startup code
   - Impact: Stale leaderboard after deploy

### ⚠️ Medium Priority
1. **No per-user trending** — Can't show "artists you follow trending this week"
   - Fix: Add `userId` FK to trending queries, parameterize scoring
   - Impact: Reduced personalization

2. **Cache invalidation is TTL-only** — Can't manually refresh on demand
   - Fix: Add Redis `INVALIDATE_CACHE` endpoint
   - Impact: Stale data if computation fails

3. **Tie-breaking undefined** — What's the rank when two artists have identical scores?
   - Fix: Add secondary sort (e.g., by artistId or name)
   - Impact: Inconsistent ranks on refresh

### 📝 Low Priority
1. Could add web UI for admin controls (currently API-only)
2. Could add historical trending archive (for trend analysis)
3. Could optimize BigInt operations (minor performance gain)

---

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Compute scores (67 artists) | ~100ms | In-memory, no I/O |
| Update DB (3 windows) | ~200ms | 201 individual writes (could batch) |
| Cache write (Redis) | ~20ms | Per-window |
| Fetch from cache (API) | <5ms | Cache hit |
| Fetch from DB (API) | ~50ms | Cache miss, DB query |
| Full pipeline (hourly) | ~2–3 min | Includes all windows + DB writes |

---

## Related Pages

- [[concept-multi-window-ranking]] — Why 7d/30d/90d windows exist
- [[concept-artist-metrics]] — How metrics are tracked
- [[concept-caching-strategy]] — Why Redis here, Prisma elsewhere
- [[concept-event-flow]] — How user actions should update metrics
- [[decision-hourly-trending]] — Why hourly recompute (not on-demand)
- [[decision-separate-metrics-table]] — Why metrics ≠ artist profile
- [[architecture-trending-pipeline]] — Full computation flow
- [[architecture-data-flow]] — End-to-end system

---

## See Also

- Source code: `lib/trending/`, `lib/cron/trendingCron.js`
- API reference: `docs/API_V2.md` (GET /api/v2/trending/artists)
- System doc: `docs/trending-system.md` (detailed walkthrough)
- Scalability: `docs/TRENDING_SCALABILITY_IMPLEMENTATION.md`
