---
date: 2026-06-08
type: concept
tags: [cache, performance, architecture, redis, prisma]
---

# concept-caching-strategy

Three-layer caching strategy: Redis for hot queries, Prisma query cache for ORM, application memory for session data.

---

## Overview

ZXY Gallery uses **three distinct caching layers**, each for a different purpose:

1. **Redis** — Distributed cache for expensive computations and query results
2. **Prisma ORM** — Built-in query cache for database queries
3. **Application Memory** — In-memory storage for session/auth tokens

The question "should this be cached?" has a clear answer once you understand which layer solves which problem.

**Where it appears**:
- Trending results (`trending:artists:{window}:{limit}:{offset}`)
- Search indices (`search:index:{query_hash}`)
- Artist profile data (`artist:{id}:details`)
- Prediction results (`predictions:{artist_id}`)

---

## Core Idea: Cache by Problem Type

### Problem 1: Expensive Computation (→ Redis)

**Example**: Computing trending scores for 67 artists

```
Score Computation:
  views × 0.5 + searches × 0.3 + mentions × 0.2
  = O(n) calculation on every API call
```

**Solution**: Compute once (hourly), cache in Redis, serve 1000x faster.

```javascript
// Pseudocode
const cacheKey = `trending:artists:${window}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached); // <5ms
}

// Cache miss: recompute (expensive)
const results = computeTrendingForWindow(prisma, window); // ~100ms
await redis.setex(cacheKey, 3600, JSON.stringify(results)); // 1h TTL
return results;
```

**Why Redis, not Prisma?**
- Redis TTL is precise (1h auto-expiry)
- Computation result isn't a database row
- Want to invalidate across server instances
- JSON serialization is straightforward

### Problem 2: Database Query Optimization (→ Prisma Query Cache)

**Example**: Fetching artist details `SELECT * FROM Artist WHERE id = ?`

```text
First call: DB query (50ms)
Second call: Prisma query cache (<1ms)
Third call: Prisma query cache (<1ms)
```

**Solution**: Prisma's built-in `findUnique` cache (request-scoped).

```javascript
// Prisma automatically caches within same request
const artist1 = await prisma.artist.findUnique({ where: { id: 'alice' } }); // DB hit
const artist2 = await prisma.artist.findUnique({ where: { id: 'alice' } }); // Cache hit
```

**Why Prisma, not Redis?**
- Single-request scope (safe for mutable data)
- Automatic invalidation (request boundary)
- Zero configuration needed
- Handles stale data correctly

### Problem 3: Session/Auth State (→ Application Memory)

**Example**: Current user's preferences, temporary tokens

```javascript
// In-memory store (don't use Redis — requires serialization)
const sessionCache = new Map();
sessionCache.set(userId, { preferences, token });
```

**Why App Memory, not Redis?**
- Small data (user preferences)
- High update frequency (user changes settings)
- Session-local scope (no cross-instance sharing needed)
- Serialization overhead not worth it

---

## Examples in ZXY3

### Layer 1: Redis (Hot Queries)

| Query | Cache Key | TTL | Invalidation |
|-------|-----------|-----|--------------|
| Trending leaderboard | `trending:artists:{window}:{limit}:{offset}` | 1h | Hourly cron |
| Search results | `search:index:{query_hash}` | 5m | Expiry |
| Artist details | `artist:{id}:details` | 15m | Expiry or manual |
| Predictions | `predictions:{artist_id}` | 24h | Daily refresh |

**Example: Trending Cache**
```javascript
// lib/trending/calculator.js
async function getTrendingFromCache(window, limit, offset) {
  const key = `trending:artists:${window}:${limit}:${offset}`;
  const cached = await redis.get(key);
  
  if (cached) return JSON.parse(cached); // <5ms
  
  // Recompute
  const results = await computeTrendingForWindow(prisma, window);
  const page = paginate(results, limit, offset);
  
  await redis.setex(key, 3600, JSON.stringify(page)); // 1h
  return page;
}
```

### Layer 2: Prisma Query Cache

```javascript
// Implicit within a request
async function handleGetArtist(req, res) {
  // First call: DB query (50ms)
  const artist = await prisma.artist.findUnique({
    where: { id: req.query.id }
  });
  
  // Second call in same request: cache hit (<1ms)
  const artworks = await prisma.artwork.findMany({
    where: { artistId: artist.id }
  });
  
  // Both queries used, but artist only fetched once
  return { artist, artworks };
}
```

### Layer 3: Application Memory

```javascript
// pages/api/auth.js (session management)
const sessionStore = new Map();

function setSession(userId, token) {
  sessionStore.set(userId, {
    token,
    createdAt: Date.now(),
    preferences: {} // User preferences
  });
}

function getSession(userId) {
  return sessionStore.get(userId);
}
```

---

## Tradeoffs

### Redis Tradeoff: Staleness vs. Cost
**Pro**: Every query fast (1h cache)  
**Con**: Stale data for 1h (rankings may be outdated)  
**Decision**: 1h is acceptable for trending (user expectations set by other platforms)

```text
Possible Solutions:
- Reduce TTL to 5m (higher Redis load, more recomputes)
- Manual invalidation (operational overhead)
- Real-time updates via WebSocket (much more complex)

Chosen: Keep 1h TTL, accept staleness
```

### Prisma Cache Tradeoff: Simplicity vs. Control
**Pro**: Zero config, safe by default (request-scoped)  
**Con**: Can't control across requests  
**Decision**: Perfect for our use case (most queries are one-off per request)

### Memory Cache Tradeoff: Speed vs. Restart Loss
**Pro**: <1ms lookup  
**Con**: Lost on server restart  
**Decision**: OK for sessions (Clerk handles persistence)

---

## When to Apply vs. When to Avoid

### Use Redis When:
- ✅ Computation is expensive (trending scores, ML predictions)
- ✅ Result is static for a period (1h, 1d, etc.)
- ✅ Multiple requests serve same data
- ✅ TTL-based expiry is acceptable

### Avoid Redis When:
- ❌ Data changes frequently (<1 min invalidation needed)
- ❌ Data is small (<1KB) and rarely accessed
- ❌ Exact consistency required (user profile, cart)
- ❌ Serialization overhead dominates

### Use Prisma Cache When:
- ✅ Single request, multiple queries
- ✅ Same record fetched twice (lookups)
- ✅ Don't need cross-request consistency
- ✅ Data is mutable (user changes it)

### Use Application Memory When:
- ✅ Session/auth state
- ✅ Request-local data
- ✅ Small objects (<1KB each)
- ✅ High churn (frequent updates)

---

## Current Performance

| Layer | Avg Latency | Hit Rate | Notes |
|-------|------------|----------|-------|
| Redis | <5ms | 98% (trending) | Cache hits dominate traffic |
| Prisma | <1ms | 95% (within request) | Reduces DB load |
| Memory | <0.1ms | 100% (sessions) | No I/O, purely in-memory |
| DB miss | 50ms | 2% | Falls back to database |

**Effective latency**: ~5ms p50 for trending (cached), ~50ms p50 on cache miss.

---

## Open Questions

1. **Should artist details be in Redis?** Currently TTL is 15m; could be 1h for better cache hit rate
2. **Could we batch invalidation?** Currently per-key; could group by artist or window
3. **Is 1h TTL optimal for trending?** No data on user expectations; could survey

---

## Related Pages

- [[entity-redis-cache]] — Redis implementation details
- [[entity-prisma-orm]] — Prisma ORM and query optimization
- [[concept-event-flow]] — How cache invalidation fits in event pipeline
- [[decision-redis-for-trending]] — Why Redis for trending (not compute on-demand)
- [[architecture-data-flow]] — Full cache flow in context of user requests

---

## See Also

- Source: `lib/redis.js` (Redis client)
- Source: `lib/trending/` (cache usage example)
- Perf: `docs/SCALABILITY_IMPROVEMENTS.md`
