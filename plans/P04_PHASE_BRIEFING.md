# P04 Phase Briefing: Value Prediction System

## Overview

**Phase**: P04 - Value Prediction System
**Duration**: 2 weeks
**Goal**: Integrate ML-powered value predictions for artists
**Dependency**: P03 ✓
**Requirements**: REQ-104, NFR-201, NFR-204

---

## What Gets Built

A complete prediction system that estimates artwork value across multiple time horizons using ML models.

### Core Features
- **Multi-Period Predictions**: 1Y, 3Y, 5Y, 10Y value forecasts
- **Confidence Intervals**: Lower/upper bounds for each prediction
- **Batch Processing**: Predict all artists on schedule
- **API Endpoint**: `/api/v2/predictions/{artist_id}`
- **Caching**: 7-day TTL for performance
- **Fallback**: Graceful degradation when ML service unavailable

### Data Structure
```javascript
{
  artist_id: 123,
  period: "5Y",
  predicted_value: 7500,
  confidence_lower: 6750,
  confidence_upper: 8250,
  model_version: "v1.0",
  created_at: "2026-01-13T12:00:00Z"
}
```

---

## Execution Steps

### Step 1: ML Service Setup
- Create Replicate.com account
- Obtain API token
- Add to `.env`: `REPLICATE_API_TOKEN`
- Verify connectivity

### Step 2: Prediction Service Wrapper
- **File**: `lib/predictions/valuePredictionService.js`
- **Function**: `predictArtistValue(artistId, periods)`
- **Input**: Artist ID, list of periods (default: ['1Y', '3Y', '5Y', '10Y'])
- **Output**: Predictions with confidence intervals
- **Logic**: Fetch artist data → Call ML API → Parse response → Return formatted

### Step 3: Batch Prediction Job
- **File**: `scripts/batch_predict_artists.js`
- **Usage**:
  ```bash
  node scripts/batch_predict_artists.js --limit=100 --dry-run
  node scripts/batch_predict_artists.js --limit=1000
  ```
- **Logic**: Query artists → Predict each → Upsert to DB → Log results
- **Features**: Dry-run mode, error handling, batch timing

### Step 4: API Endpoint
- **File**: `pages/api/v2/predictions/[artist_id].js`
- **Method**: GET
- **Query Params**: `period` (optional: 1Y, 3Y, 5Y, 10Y)
- **Response**: Array of predictions with metadata
- **Caching**: 7-day TTL via Redis

### Step 5: Frontend Display
- **File**: Update artist profile page
- **Display**: Predictions table with periods, values, confidence ranges
- **Optional**: Trend chart across periods
- **Disclaimer**: "Predictions are estimates based on historical data"

### Step 6: Caching & Fallback
- **Primary**: Fetch from Replicate API
- **Fallback**: Return cached prediction (if available)
- **Error**: Return 503 with friendly message + log to Sentry
- **TTL**: 7 days

### Step 7: Backtest & Validation
- **File**: `scripts/backtest_predictions.js`
- **Logic**: Compare past predictions vs actual prices
- **Metric**: MAPE (Mean Absolute Percentage Error)
- **Target**: ≤15% error (≥85% accuracy)
- **Usage**: `node scripts/backtest_predictions.js --months_ago=6`

### Step 8: Testing
- **Unit Tests**: `tests/unit/valuePredictionService.test.js`
  - Mock Replicate response
  - Test error handling
  - Verify parsing and formatting
- **Integration Tests**: `tests/integration/predictions.test.js`
  - Batch prediction → DB insertion
  - API endpoint returns all periods
  - Caching works correctly

---

## Exit Criteria

### Green (Proceed to P05)
✅ Predictions API functional for all periods
✅ Batch job completes without errors
✅ Confidence intervals present and reasonable
✅ Caching works (7d TTL)
✅ Fallback shows cached data when service down
✅ Backtest accuracy ≥85%
✅ Integration tests passing

### Yellow (Proceed with Caution)
⚠️ Accuracy 80-85% (acceptable, refine in P07)
⚠️ ML response time 2-5 seconds (acceptable)

### Red (Stop & Resolve)
❌ API returns errors
❌ Batch fails on >10% of artists
❌ Accuracy <75%
❌ No fallback when service unavailable

---

## Key Considerations

### Architecture
- **External Dependency**: Replicate.com API (managed risk via caching + fallback)
- **Database**: Store predictions in `price_predictions` table
- **Caching**: Redis for 7-day TTL
- **Error Handling**: Graceful degradation, comprehensive logging

### Performance
- **Response Time**: <500ms (from cache) or 2-5s (first call)
- **Batch Job**: Runs asynchronously, processes in batches
- **Caching**: Reduces ML API calls by 99%+ (7-day TTL)

### Quality Gates
- **Accuracy Target**: ≥85% (±15% error acceptable)
- **Availability**: 99%+ (with fallback to cached data)
- **Test Coverage**: Unit + integration tests required

### Risk Mitigation
1. **ML Service Unavailable**: Cached data fallback (7-day TTL)
2. **Low Accuracy**: Backtest before production, refine in P07
3. **Feature Scope Creep**: Lock to 4 periods (1Y, 3Y, 5Y, 10Y)

---

## Files to Create

```
lib/predictions/
  └── valuePredictionService.js         # ML service wrapper

pages/api/v2/predictions/
  └── [artist_id].js                    # Predictions API endpoint

scripts/
  ├── batch_predict_artists.js          # Batch prediction job
  └── backtest_predictions.js           # Validation script

tests/unit/
  └── valuePredictionService.test.js    # Unit tests

tests/integration/
  └── predictions.test.js               # Integration tests
```

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| API Response Time (cached) | <500ms | ⏳ |
| API Response Time (fresh) | <3s | ⏳ |
| Prediction Accuracy (MAPE) | ≤15% | ⏳ |
| Batch Job Duration (1000 artists) | <10 min | ⏳ |
| Cache Hit Rate | >99% | ⏳ |
| Test Coverage | >90% | ⏳ |
| Availability (with fallback) | >99.5% | ⏳ |

---

## Next Phase (P05)

After P04 is complete, P05 will focus on:
- Artist onboarding and import pipeline
- Event aggregation from multiple sources
- Event calendar API and frontend

P05 can run in parallel with P03-P04 if resources allow.

---

## Notes

- **ML Model**: Using Replicate.com for simplicity; can switch providers later
- **Periods**: Fixed to 4 periods to prevent scope creep
- **Accuracy**: Target ≥85%; if <75%, consider model retraining in P07
- **Caching**: 7-day TTL chosen as balance between freshness and cache efficiency
- **Fallback**: Critical for production stability; must be tested
- **Backtest**: Optional if no historical data; skip if not available

---

## Success = All Exit Criteria Green ✓
