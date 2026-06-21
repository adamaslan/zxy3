# Trending System — Current State

## Summary

The trending system is **fully wired end-to-end** but runs on **seeded mock data**, not real user activity. Rankings compute correctly; the pipeline that feeds real events into the metrics table does not exist yet.

---

## Data Flow

```
prisma/seed.js
  → ArtistMetrics (randomInt values)
      → lib/trending/calculator.js  (fetch + score)
          → lib/trending/scorer.js  (weighted formula)
              → ArtistMetrics.trendingRank (written back)
                  → GET /api/v2/trending/artists
                      → pages/trending.js  (full leaderboard)
                      → pages/posts/artists.js  (sidebar, top 10)
```

---

## Backend

### Database — `ArtistMetrics`

| Column | Type | Description |
|--------|------|-------------|
| `artistId` + `metricWindow` | BigInt + String | Composite PK |
| `viewCount` | BigInt | Profile views |
| `searchFrequency` | BigInt | Search hits |
| `marketMentions` | BigInt | External mentions |
| `searchHits` | Int | (separate search counter) |
| `profileViews` | Int | (separate view counter) |
| `trendingRank` | BigInt? | Rank within window after computation |
| `computedAt` | DateTime | Last computation timestamp |

**3 rows per artist** — one for each window (`7d`, `30d`, `90d`). 67 artists × 3 = 201 rows.

**Data source: all fake.** `prisma/seed.js` populates `viewCount`, `searchFrequency`, and `marketMentions` with `randomInt()`. No user events are tracked.

### Scoring — `lib/trending/scorer.js`

```
trendScore = (viewCount × 0.5) + (searchFrequency × 0.3) + (marketMentions × 0.2)
```

Then ranked descending. Percentile calculated against the full cohort.

### Calculator — `lib/trending/calculator.js`

- `computeTrendingForWindow(prisma, window)` — fetches metrics, converts BigInt to numbers, scores + ranks
- `updateTrendingRanks(prisma, window)` — writes `trendingRank` back to DB
- `computeAllTrending(prisma)` — runs all 3 windows sequentially
- `getTrendingArtists(prisma, window, limit, offset)` — used by the API; fetches ranked records and merges artist name/links

### Cron — `lib/cron/trendingCron.js`

- Runs on `node-cron` schedule: **every hour at :00** (`0 * * * *`)
- Must be manually started via API — **not auto-started on server boot**
- In-process only; does not survive server restarts

### Admin API

| Endpoint | Method | What it does |
|----------|--------|--------------|
| `/api/v2/admin/cron/trending/start` | POST | Start hourly cron |
| `/api/v2/admin/cron/trending/stop` | POST | Stop cron |
| `/api/v2/admin/cron/trending/status` | GET | Is cron running + next run time |
| `/api/v2/admin/cron/trending/run-now` | POST | Trigger computation immediately |

All four are protected by `withAdminAuth` middleware.

### Public API — `GET /api/v2/trending/artists`

Query params: `window` (7d/30d/90d), `limit` (default 100), `offset` (default 0)

- Redis-cached, TTL 1 hour, key pattern `trending:artists:{window}:{limit}:{offset}`
- Rate limited: 20 req/min
- Returns: rank, artistId, name, trendScore, percentile, metrics object, portfolioUrl, instagramHandle

### Manual Script

```bash
npm run trending   # node ../artist-db/cockroach-db/scripts/run-trending-ranks.js
```

Runs `computeAllTrending` directly (bypasses cron, no Redis, no auth). Used for one-off computation.

---

## Frontend

### `/trending` — Full Leaderboard (`pages/trending.js`)

- Client-side fetch on mount and on window tab change (7d / 30d / 90d)
- Renders via `components/TrendingList.js`
- Shows: rank badge (gold/silver/bronze for top 3), trend score, percentile, metrics bar chart (views/searches/mentions), portfolio and Instagram links
- Shows aggregate stats: total artists ranked, top score, total views

### `/posts/artists` — Sidebar (`pages/posts/artists.js`)

- Fetches top 10 for selected window
- Window tabs: 7d / 30d / 90d
- Shows: rank number, name, career badge, score, view count
- Empty state: `No trending data yet. Run: npm run trending`

---

## Known Issues / Gaps

| Issue | Status |
|-------|--------|
| Metrics are seeded fake data | Not started |
| No event tracking on profile views | Not started |
| No event tracking on searches | Not started |
| Cron is not auto-started on server boot | Not started |
| Cron is in-process (dies on restart) | Not started |
| `marketMentions` has no data source | Not started |
| Score color thresholds in `TrendingList` assume 0–100 scale but raw scores exceed 100 | Bug |
| `/artists/{artistId}` route linked from `TrendingList` does not exist | Bug |

---

## Implementation Plan: Real Metrics Collection

The existing codebase already has the scoring engine, the trending API, the cron infrastructure, and Redis caching. What's missing is the **data collection layer** — the part that records what users actually do and feeds it into the metrics table.

Below is a phased approach, ordered so each step delivers standalone value before the next one starts.

---

### Phase 1: Inline Counters (Smallest Change, Immediate Value)

Instrument the two API routes that already handle artist traffic. No new tables, no new infrastructure. Just increment the counters that already exist in `ArtistMetrics`.

**What to change:**

**`pages/api/v2/artists/[id].js`** — track profile views

After the artist is fetched and before the response is sent, fire-and-forget an upsert:

```javascript
// After line 87 (res.status(200).json...)
// Fire-and-forget: don't await, don't block the response
prisma.artistMetrics.upsert({
  where: {
    artistId_metricWindow: { artistId, metricWindow: '7d' }
  },
  update: { viewCount: { increment: 1 } },
  create: {
    artistId,
    metricWindow: '7d',
    viewCount: 1,
    searchFrequency: 0,
    marketMentions: 0,
  }
}).catch(err => console.error('View tracking failed:', err.message));
```

Repeat for `30d` and `90d` windows or, better, loop over all three.

**`pages/api/v2/artists/index.js`** — track searches

Only when the `search` query param is present. For each artist returned in the search results, increment `searchFrequency`:

```javascript
// After the query executes, if search param was provided
if (search && artists.length > 0) {
  const artistIds = artists.map(a => a.id);
  for (const window of ['7d', '30d', '90d']) {
    prisma.$executeRawUnsafe(
      `UPDATE artist_metrics
       SET search_frequency = search_frequency + 1
       WHERE artist_id = ANY($1::bigint[]) AND metric_window = $2`,
      artistIds, window
    ).catch(err => console.error('Search tracking failed:', err.message));
  }
}
```

**Tradeoffs:**
- Pros: 2 file changes, no migrations, works today
- Cons: every window gets the same increment (a view today counts toward both 7d and 90d forever), no way to age out old events, cached responses don't trigger tracking (Redis cache sits in front of the handler)

**Cache interaction:** The `withRedisCache` middleware short-circuits the handler entirely on cache hits. This means cached artist detail pages won't record views. Options:
1. Move tracking *before* the cache middleware (wrap the cached handler)
2. Accept under-counting (cache TTL is 24h for artist detail, so the first view each day is tracked)
3. Track at a middleware layer that runs before cache (see Phase 2)

---

### Phase 2: Event Log Table (Proper Time Windows)

Phase 1's counters can't distinguish a view from 6 days ago vs. 8 days ago — both sit in the `7d` row. To make windows accurate, log individual events and aggregate them at compute time.

**New Prisma model:**

```prisma
model ArtistEvent {
  id        BigInt   @id @default(sequence())
  artistId  BigInt   @map("artist_id")
  eventType String   @map("event_type")  // "view" | "search" | "mention"
  createdAt DateTime @default(now()) @map("created_at")

  artist    Artist   @relation(fields: [artistId], references: [id])

  @@index([artistId, eventType, createdAt])
  @@map("artist_events")
}
```

**How events are recorded:**

Replace the Phase 1 upserts with simple inserts:

```javascript
prisma.artistEvent.create({
  data: { artistId, eventType: 'view' }
}).catch(err => console.error('Event log failed:', err.message));
```

One row per event. Cheap to write, easy to reason about.

**How the cron job changes:**

Instead of reading pre-aggregated `ArtistMetrics` rows, the cron counts events per window:

```sql
SELECT artist_id,
       COUNT(*) FILTER (WHERE event_type = 'view')    AS view_count,
       COUNT(*) FILTER (WHERE event_type = 'search')  AS search_frequency,
       COUNT(*) FILTER (WHERE event_type = 'mention') AS market_mentions
FROM   artist_events
WHERE  created_at >= NOW() - INTERVAL '7 days'
GROUP  BY artist_id
```

Then upsert those counts into `ArtistMetrics` for the `7d` window. Repeat for `30d` and `90d`.

**Cleanup:** Schedule a nightly job to delete events older than 90 days (the longest window):

```sql
DELETE FROM artist_events WHERE created_at < NOW() - INTERVAL '91 days'
```

**Tradeoffs:**
- Pros: accurate time windows, can replay/recompute any window, audit trail
- Cons: table grows with traffic (1 row per event), requires a migration, cleanup job needed

---

### Phase 3: Track Before Cache

The Redis cache middleware (`withRedisCache`) returns cached responses without ever calling the handler. This means Phase 1 and Phase 2 tracking only fires on cache misses.

**Option A: Tracking middleware wrapper**

Wrap the *cached* handler with a lightweight middleware that logs the event before checking cache:

```javascript
// lib/middleware/trackEvent.js
function withEventTracking(handler, { eventType, getArtistId }) {
  return async (req, res) => {
    const artistId = getArtistId(req);
    if (artistId) {
      prisma.artistEvent.create({
        data: { artistId: BigInt(artistId), eventType }
      }).catch(() => {});
    }
    return handler(req, res);
  };
}
```

Then in the route file:

```javascript
// pages/api/v2/artists/[id].js
const tracked = withEventTracking(cachedHandler, {
  eventType: 'view',
  getArtistId: (req) => req.query.id
});
export default withRateLimit(tracked, { ... });
```

This runs on every request regardless of cache state.

**Option B: Redis INCR (no DB write on hot path)**

If the event table insert is too slow for every request, use Redis `INCR` as a fast counter and flush to the database periodically:

```javascript
// On every request
await redis.incr(`events:view:${artistId}`);

// In cron job: read Redis counters, write to DB, reset
const keys = await redis.keys('events:view:*');
for (const key of keys) {
  const count = await redis.getdel(key);
  const artistId = key.split(':')[2];
  // upsert into ArtistMetrics or ArtistEvent table
}
```

**Tradeoffs:**
- Option A: simple, one middleware, but a DB write on every request
- Option B: fast (Redis INCR is sub-millisecond), but adds a flush step and Redis becomes stateful

---

### Phase 4: Market Mentions (External Data)

`marketMentions` has no source today. Options for populating it:

1. **Manual CSV import** — periodically upload mention counts from art market newsletters, Artsy, Artnet, etc.
2. **Web scraping job** — scheduled script that searches artist names on target sites and counts results
3. **API integrations** — if Artsy, Artnet, or Google News have APIs, query them on the cron schedule and store mention counts as `mention` events in the event log

This is the least urgent metric (weighted at only 20%) and likely the last to implement.

---

### Recommended Starting Point

**Start with Phase 1** (inline counters in `[id].js` and `index.js`). It's two file changes, zero migrations, and gives you real data flowing within minutes. The counters won't have accurate time-window decay, but they'll replace the random seed data with actual user signal.

Move to Phase 2 when you care about the difference between "trending this week" vs. "trending this month" being accurate. That requires one migration and updating the cron job.

Phase 3 matters once Redis cache hit rates are high enough that you're missing most events. Check by comparing `viewCount` growth against server access logs.

### Files to Touch

| Phase | Files | Migration? |
|-------|-------|------------|
| 1 | `pages/api/v2/artists/[id].js`, `pages/api/v2/artists/index.js` | No |
| 2 | New: `lib/middleware/trackEvent.js`, update: `prisma/schema.prisma`, `lib/trending/calculator.js`, `lib/cron/trendingCron.js` | Yes |
| 3 | `pages/api/v2/artists/[id].js` (reorder middleware), or new `lib/middleware/trackEvent.js` | No |
| 4 | New: `../artist-db/cockroach-db/scripts/fetch-mentions.js` or similar | Maybe |

### Cron Auto-Start

Regardless of phase, the cron job should start automatically. Currently it requires a manual `POST /api/v2/admin/cron/trending/start`. Add to a Next.js instrumentation file or custom server:

```javascript
// instrumentation.js (Next.js 14+)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startTrendingCron } = require('./lib/cron/trendingCron');
    startTrendingCron();
  }
}
```
