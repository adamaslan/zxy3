# Phase P02: Server-Driven Data Layer & Query Optimization

**Status:** 🚀 IN PROGRESS
**Start Date:** 2026-01-12
**Duration:** 2 weeks
**Dependency:** Phase P01 ✅ COMPLETE

---

## Executive Summary

Phase P02 transforms the application from client-side data fetching to server-driven patterns. This phase optimizes API performance through:
- New `/api/v2` endpoint structure with request validation
- Redis caching layer for high-traffic queries
- Database index optimization for faster queries
- Pages Router modernization with server-side rendering
- Performance baseline testing and validation

---

## Phase Objectives

| Objective | Description | Success Criteria |
|-----------|-------------|------------------|
| **API v2 Foundation** | Create new endpoint structure | 4 working endpoints: artworks, artists (GET /all, /[id]) |
| **Request Validation** | Zod schema validation middleware | All requests validated; 400 errors for invalid input |
| **Caching Layer** | Redis with TTL strategy | Cache hits confirmed via HTTP headers (Age header present) |
| **Query Optimization** | Add strategic database indexes | Query time <100ms; indexes verified |
| **Server-Side Rendering** | Update pastshows.js with getServerSideProps | ISR working; Cache-Control headers present |
| **Performance Improvement** | Baseline vs. optimized comparison | p95 latency <200ms in load test |
| **Backward Compatibility** | Old API routes still work | All legacy endpoints return same data structures |

---

## Execution Plan: 8 Steps

### Step 1: API v2 Foundation ⬜
**Goal:** Create the foundation for new API endpoints
**Files to Create:**
- `pages/api/v2/artworks/index.js` - GET all artworks with filtering
- `pages/api/v2/artworks/[id].js` - GET single artwork
- `pages/api/v2/artists/index.js` - GET all artists
- `pages/api/v2/artists/[id].js` - GET single artist
- `lib/api/handlers.js` - Base handler pattern (error, validation, caching)
- `lib/api/validators.js` - Zod schemas for request/response validation

**Verification:**
```bash
curl http://localhost:3000/api/v2/artworks?limit=5 2>/dev/null | jq '.data | length'
# Expected: 5 (or fewer if DB has <5 records)
```

---

### Step 2: Middleware Setup ⬜
**Goal:** Implement validation and caching middleware
**Files to Create:**
- `lib/middleware/validation.js` - Zod validation wrapper
- `lib/middleware/cache.js` - Cache decorator pattern

**Verification:**
```bash
npm run test:unit -- middleware.test.js
# Expected: All validation and caching tests pass
```

---

### Step 3: Redis Integration ⬜
**Goal:** Setup Redis connection and basic caching
**Files to Create:**
- `lib/redis.js` - Redis singleton client with error handling
- `lib/middleware/redisCache.js` - Cache middleware using Redis

**Prerequisites:**
- Redis running locally or via Docker: `docker run -d -p 6379:6379 redis:latest`

**Verification:**
```bash
redis-cli PING
# Expected: PONG
```

---

### Step 4: Query Optimization ⬜
**Goal:** Add database indexes for faster queries
**Action:** Create Prisma migration for indexes

**Indexes to Create:**
- `idx_artworks_artist_id` on artworks(artist_id)
- `idx_artworks_source_id` on artworks(source_id)
- `idx_artist_metrics_artist_id` on artist_metrics(artist_id)
- `idx_artist_name` UNIQUE on artists(LOWER(name))

**Verification:**
```bash
# After migration:
psql $DATABASE_URL -c "\d artworks" | grep -i "indexes"
# Expected: All 4+ indexes listed
```

---

### Step 5: Pages Router Modernization ⬜
**Goal:** Update pages/posts/pastshows.js for server-side rendering
**Changes:**
- Add `getServerSideProps()` for initial data fetch
- Remove client-side `useEffect` data fetching
- Implement ISR (Incremental Static Regeneration) with 1h revalidate

**Verification:**
```bash
npm run build && npm run start
curl -I http://localhost:3000/posts/pastshows | grep Cache-Control
# Expected: Cache-Control: public, max-age=3600
```

---

### Step 6: Caching Strategy ⬜
**Goal:** Implement TTL-based caching for API endpoints
**Cache Configuration:**
- Artworks: 1h TTL (changes infrequently)
- Artists: 24h TTL (changes very rarely)
- Metrics: 4h TTL

**Verification:**
```bash
# First request (cache miss):
curl -I http://localhost:3000/api/v2/artworks | grep -i "cache\|age"
# Expected: No Age header

# Second request within 1h (cache hit):
curl -I http://localhost:3000/api/v2/artworks | grep -i "cache\|age"
# Expected: Age header present (e.g., Age: 23)
```

---

### Step 7: Load Testing ⬜
**Goal:** Create performance baseline comparing v1 vs v2
**Files to Create:**
- `tests/load/v1-vs-v2.k6.js` - k6 load test script

**Metrics to Capture:**
- Response time (p50, p95, p99)
- Throughput (requests/sec)
- Error rate
- Cache hit ratio

**Verification:**
```bash
k6 run tests/load/v1-vs-v2.k6.js --vus 100 --duration 5m
# Expected: v2 p95 latency <200ms (better than v1)
```

---

### Step 8: Backward Compatibility Tests ⬜
**Goal:** Verify old API routes still work identically
**Files to Create:**
- `tests/integration/backward-compatibility.test.js`

**Test Matrix:**
- `/api/artworks` returns same data structure
- `/api/search` works unchanged
- Response times equal or faster than before

**Verification:**
```bash
npm run test:integration -- backward-compatibility.test.js
# Expected: All 5+ tests pass
```

---

## Exit Gate Rules

### 🟢 GREEN (Proceed to P03)
- [x] API v2 endpoints fully functional
- [x] Caching working (HTTP Age header verified)
- [x] Database query time <100ms
- [x] Page load time improved (ISR working)
- [x] Backward compatibility verified
- [x] Load test shows p95 <200ms
- [x] All integration tests passing

### 🟡 YELLOW (Proceed with Caution)
- Query time 100-150ms (acceptable, optimize in P06)
- Cache hit rate 70-80% (acceptable, tune in P06)

### 🔴 RED (Stop & Resolve)
- API endpoints non-functional
- Cache not working
- Database queries >200ms
- Backward compatibility broken

---

## Phase Metrics

| Metric | Target |
|--------|--------|
| **Confidence** | 90% (standard patterns; caching well-known) |
| **Robustness** | 85% (cache invalidation needs tuning) |
| **Internal Complexity** | 50% (multiple endpoints, validation) |
| **External Complexity** | 40% (Redis, CockroachDB optimization) |
| **Feature Creep Risk** | 20% (additional filtering may be requested) |
| **Technical Debt** | 10% (cache strategy may need Phase P06 tuning) |

---

## Key Decisions

### Decision 1: Caching Backend
- **Choice:** Redis
- **Rationale:** Simple key-value store, fast, well-integrated with Node.js
- **Alternative Considered:** In-memory (less scalable, per-instance)

### Decision 2: Validation Framework
- **Choice:** Zod
- **Rationale:** Type-safe, expressive, good error messages
- **Alternative Considered:** Joi (heavier, more verbose)

### Decision 3: ISR Strategy
- **Choice:** 1h TTL on artworks pages
- **Rationale:** Balance between freshness and cache hits
- **Alternative Considered:** On-demand revalidation (more complex)

---

## Dependencies & Assumptions

### External Dependencies
- Redis server running and accessible
- CockroachDB with P01 schema migrated
- Prisma client initialized
- k6 installed (for load testing)

### Assumptions
- Database currently has <1000 artworks (performance targets assume this scale)
- No active user load during development
- ISR cache invalidation sufficient (no real-time updates needed)

---

## Risk Mitigation

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Redis connection fails | MEDIUM | Graceful fallback to direct DB queries; error handling |
| Cache invalidation issues | LOW | Short TTLs prevent stale data; manual invalidation available |
| Performance regression | LOW | Baseline testing before/after comparison |
| API v2 incompatibility | LOW | Backward compatibility tests ensure old routes work |

---

## Timeline Breakdown

| Step | Estimated Time | Start | End |
|------|-----------------|-------|-----|
| 1. API v2 Foundation | 2 days | Jan 12 | Jan 13 |
| 2. Middleware Setup | 1 day | Jan 14 | Jan 14 |
| 3. Redis Integration | 1 day | Jan 15 | Jan 15 |
| 4. Query Optimization | 1 day | Jan 16 | Jan 16 |
| 5. Pages Router Modernization | 2 days | Jan 17 | Jan 18 |
| 6. Caching Strategy | 1 day | Jan 19 | Jan 19 |
| 7. Load Testing | 2 days | Jan 20 | Jan 21 |
| 8. Backward Compatibility | 2 days | Jan 22 | Jan 23 |
| **Buffer/Polish** | 2 days | Jan 24-25 | Jan 25 |

---

## Deliverables Checklist

- [ ] `/api/v2/artworks` endpoints (index + [id])
- [ ] `/api/v2/artists` endpoints (index + [id])
- [ ] `lib/api/handlers.js` base handler
- [ ] `lib/api/validators.js` Zod schemas
- [ ] `lib/middleware/validation.js` validation middleware
- [ ] `lib/middleware/cache.js` cache middleware
- [ ] `lib/redis.js` Redis client singleton
- [ ] Prisma migration with 4+ indexes
- [ ] Updated `pages/posts/pastshows.js` with getServerSideProps
- [ ] `tests/load/v1-vs-v2.k6.js` load test
- [ ] `tests/integration/backward-compatibility.test.js` tests
- [ ] Performance baseline report (v1 vs v2 latency)
- [ ] Cache validation report (hit rates, Age headers)

---

## Related Documentation

- **P01 Summary:** `plans/P01_COMPLETION_SUMMARY.md` ✅
- **Roadmap:** `plans/zxy-modernization-roadmap.md`
- **Data Flow Docs:** `dataflow.md`, `next-app-router-dataflow.md`

---

## Next Phase

**Phase P03: Trending Artists Module** (depends on P02)
- Event tracking infrastructure
- Trending computation algorithm
- Trending API endpoint
- Frontend trending page

---

**Phase P02 Initialized:** 2026-01-12
**Status:** Ready to begin Step 1
