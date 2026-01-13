# Phase P03: Trending Artists Module

**Status:** 🚀 READY TO START
**Duration:** 1 week
**Dependency:** Phase P02 ✅ COMPLETE

---

## Objective

Build a trending artists system that ranks artists by viewership, search frequency, and market mentions using the cached data layer from P02.

---

## Execution Plan: 4 Steps

### Step 1: Trending Computation Engine
**Goal:** Calculate trending scores from existing metrics
**Files to Create:**
- `lib/trending/calculator.js` - Compute trends from ArtistMetrics
- `lib/trending/scorer.js` - Score algorithm (weighted sum of metrics)

**Formula:**
```
trendScore = (viewCount × 0.5) + (searchFrequency × 0.3) + (marketMentions × 0.2)
```

**Verification:**
```bash
npm run test:unit -- trending.test.js
# Expected: Algorithm tests pass
```

---

### Step 2: Trending API Endpoint
**Goal:** Expose trending data via REST API
**Files to Create:**
- `pages/api/v2/trending/artists.js` - GET trending artists (cached 1h)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "rank": 1,
      "artistId": "123",
      "name": "Artist Name",
      "trendScore": 95.3,
      "metrics": {
        "viewCount": 150,
        "searchFrequency": 45,
        "marketMentions": 12
      }
    }
  ],
  "meta": { "window": "7d", "computedAt": "2026-01-12T..." }
}
```

**Verification:**
```bash
curl http://localhost:3000/api/v2/trending/artists?window=7d
# Expected: Ranked list of artists
```

---

### Step 3: Batch Trending Computation
**Goal:** Compute all trending scores periodically
**Files to Create:**
- `lib/jobs/computeTrending.js` - Batch job (runs every 6 hours)

**Logic:**
1. Query ArtistMetrics for all artists (grouped by window: 7d, 30d, 90d)
2. Calculate trend scores for each window
3. Update `ArtistMetrics.trendingRank` field
4. Cache results

**Verification:**
```bash
node lib/jobs/computeTrending.js
# Expected: "Computed trending for 50 artists"
```

---

### Step 4: Trending UI Page
**Goal:** Display trending artists on frontend
**Files to Create:**
- `pages/trending.js` - Trending page with tabs (7d, 30d, 90d)
- `components/TrendingList.js` - Reusable trending list component

**Features:**
- Tabs for different time windows
- Rank badges (#1, #2, etc.)
- Link to artist detail
- Trend direction indicators

**Verification:**
```bash
npm run dev
# Visit: http://localhost:3000/trending
# Expected: Trending artists displayed with rankings
```

---

## Success Criteria

| Item | Criteria |
|------|----------|
| **Computation** | Algorithm produces consistent rankings |
| **API** | Endpoint returns top 100 artists per window |
| **Caching** | Trending endpoint cached for 1 hour |
| **Performance** | Response time <100ms (cache hit) |
| **UI** | Page loads with three time window tabs |
| **Data Quality** | At least 10 artists ranked per window |

---

## Dependencies

- Phase P02 caching layer ✅
- ArtistMetrics table ✅
- Redis for endpoint caching ✅

---

## Exit Gate

🟢 **GREEN:**
- Trending algorithm working
- API endpoint returning ranked data
- UI displaying top artists
- All tabs functional (7d, 30d, 90d)

🔴 **RED:**
- Algorithm produces incorrect rankings
- API failing or timing out
- UI page not loading

---

## Files Summary

| Step | Files | LOC |
|------|-------|-----|
| 1 | `lib/trending/calculator.js`, `scorer.js` | ~200 |
| 2 | `pages/api/v2/trending/artists.js` | ~80 |
| 3 | `lib/jobs/computeTrending.js` | ~100 |
| 4 | `pages/trending.js`, `TrendingList.js` | ~200 |
| Tests | `tests/unit/trending.test.js` | ~150 |

**Total:** ~730 lines of code, highly focused

---

**Start:** After P02 completion
**Estimated:** 5-7 working days
