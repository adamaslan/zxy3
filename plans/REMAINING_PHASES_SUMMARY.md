# Remaining Phases Summary

Quick reference guide for P04, P05, and P06 - the final phases of modernization.

---

## P04: Value Prediction System
**Duration**: 2 weeks | **Status**: 📋 Briefing Created | **Dependency**: P03 ✓

### Goal
Integrate ML-powered predictions to estimate artwork value across time horizons (1Y, 3Y, 5Y, 10Y).

### Core Deliverables
- **ML Service Wrapper**: `lib/predictions/valuePredictionService.js` (Replicate.com)
- **Batch Job**: `scripts/batch_predict_artists.js` (predict all artists)
- **API Endpoint**: `GET /api/v2/predictions/{artist_id}` (with 7-day caching)
- **Frontend**: Display predictions on artist profiles
- **Caching & Fallback**: Redis cache + graceful degradation
- **Validation**: Backtest predictions against historical data

### Key Features
- Multi-period predictions: 1Y, 3Y, 5Y, 10Y
- Confidence intervals (lower/upper bounds)
- Batch processing for all artists
- 7-day TTL caching for performance
- Fallback to cached data if ML service unavailable

### Success Criteria (Exit Green)
✅ Predictions API functional for all periods
✅ Batch job completes without errors
✅ Confidence intervals present and reasonable
✅ Caching working (7d TTL)
✅ Fallback shows cached data when service down
✅ Backtest accuracy ≥85% (MAPE ≤15%)
✅ Integration tests passing

### Risk Mitigation
- **External dependency**: Replicate API cached (7d TTL) + fallback
- **Low accuracy**: Backtest before launch, refine in P07
- **Feature scope**: Fixed to 4 periods only (no scope creep)

### See Also
📄 `/plans/P04_PHASE_BRIEFING.md` - Detailed 8-step execution plan

---

## P05: Artist Onboarding & Event Pipeline
**Duration**: 3 weeks | **Status**: 📋 Planned | **Dependency**: P02 ✓ (can run parallel with P03-P04)

### Goal
Semi-automated artist import from multiple sources + event calendar system.

### Core Deliverables
- **Source Adapters**: Saatchi Art, Artsy, CSV, ICS (base class pattern)
- **Deduplication**: Exact + fuzzy matching (Levenshtein distance)
- **Import Pipeline**: Fetch → Normalize → Deduplicate → Enrich → Validate → Upsert
- **Batch Import Script**: `scripts/import_from_source.js` with dry-run mode
- **Admin UI**: `pages/admin/imports.js` - conflict resolution, history, triggers
- **Event Aggregation**: `lib/events/eventAggregator.js` - sync exhibitions from sources
- **Event API**: `GET /api/v2/events?artist_id=X&days=90&format=json|ics`
- **Event Calendar Frontend**: Month view, filter by artist, iCalendar subscription

### Key Features
- Multiple import sources (extensible adapter pattern)
- Automatic deduplication with conflict queue
- Audit logging of all import operations
- Event sync from Saatchi Art, Artsy, ICS feeds
- iCalendar export (subscribe in Google Calendar/Outlook)
- Admin dashboard for import management and conflict resolution

### Success Criteria (Exit Green)
✅ Import pipeline deduplicates correctly
✅ Saatchi Art adapter normalizes data
✅ CSV import works (tested with sample file)
✅ Conflicts placed in manual review queue
✅ Event aggregation syncs sources
✅ Event calendar API functional
✅ Admin UI allows conflict resolution
✅ Audit log captures all import actions
✅ E2E tests pass

### Risk Mitigation
- **Deduplication errors**: Fuzzy matching (>85% similarity) + manual review queue
- **Rate limiting**: Request budgeting, exponential backoff, queuing
- **Scope**: Start with Saatchi Art only (Artsy deferred to P07)
- **Complexity**: Base adapter class for extensibility

### 9 Execution Steps
1. Gallery source adapters (Saatchi Art, Artsy, CSV, ICS)
2. Deduplication logic (exact + fuzzy matching)
3. Import pipeline (fetch → normalize → deduplicate → enrich → validate → upsert)
4. Batch import script with dry-run
5. Admin UI for import management
6. Event aggregation from multiple sources
7. Event calendar API (JSON + iCalendar formats)
8. Event calendar frontend (month view, filtering, subscription)
9. Integration + E2E testing

---

## P06: Monitoring, Documentation & Launch
**Duration**: 2 weeks | **Status**: 📋 Planned | **Dependency**: P05 ✓

### Goal
Production-harden system, document for team, launch to 100% users.

### Core Deliverables
- **Error Tracking**: Sentry.io integration (alerts on >0.1% error rate)
- **Structured Logging**: Winston/Pino JSON logs (API requests, slow queries, errors)
- **Performance Monitoring**: API response time, DB query time, cache hit rate
- **Rate Limiting**: 100 req/min per IP, 1000 req/hour per user
- **Security**: CSRF protection, encryption, HTTPS/HSTS enforcement
- **Documentation**: API reference, schema guide, development setup, import guide, troubleshooting
- **Runbook**: On-call playbooks, incident response, deployment rollback
- **Testing**: Staging validation, beta launch (10% users), production release

### Key Features
- Comprehensive error tracking and alerting
- Performance SLOs: p95 <200ms, error rate <0.1%, uptime 99.95%
- Rate limiting to prevent abuse and protect external APIs
- Security hardening: TLS, CSRF, encryption
- Complete team documentation and training
- Phased launch: staging → 10% beta → 100%

### Success Criteria (Exit Green)
✅ All SLAs met in staging (p95 <200ms, error <0.1%)
✅ Sentry configured and operational
✅ Rate limiting working
✅ HTTPS/TLS enforced
✅ Documentation complete and reviewed
✅ Team training completed
✅ Runbook created and tested
✅ Beta launch successful (10% users, positive feedback)

### Risk Mitigation
- **Schema migration**: Dry-run first, backup before, reversible script
- **Data loss**: Dual-write pattern, row count validation
- **Performance**: Load testing, query profiling, caching tuning
- **Security**: OWASP compliance, penetration testing (optional)
- **Team adoption**: Gradual rollout, early engagement, support channel

### 10 Execution Steps
1. Error tracking & logging (Sentry integration)
2. Structured logging (Winston/Pino JSON)
3. Performance monitoring (APM/Datadog or built-in)
4. Rate limiting (100 req/min per IP, 1000 req/hour per user)
5. Security hardening (CSRF, encryption, TLS/HTTPS)
6. Comprehensive documentation (API, schema, dev setup, troubleshooting)
7. Runbook & team training (incident response, deployment)
8. Staging validation (full stack testing)
9. Beta launch (10% users, monitor for 24h)
10. Production release (100% users, monitor SLOs)

---

## Timeline Overview

| Phase | Duration | Key Goal | Status |
|-------|----------|----------|--------|
| **P02** | 2 weeks | Redis + query optimization | ✅ Complete |
| **P03** | 2 weeks | Trending analytics module | ✅ Complete |
| **P04** | 2 weeks | ML value predictions | 📋 Briefing done |
| **P05** | 3 weeks | Artist onboarding + events | 📋 Planned |
| **P06** | 2 weeks | Production hardening + launch | 📋 Planned |
| **TOTAL** | ~11 weeks | Full modernization | 🚀 In progress |

---

## Launch Readiness Checklist

### Pre-P04
- [ ] P03 complete with 86/86 tests passing ✅
- [ ] Scalability improvements documented ✅

### Post-P04
- [ ] ML predictions functional (accuracy ≥85%)
- [ ] Batch prediction job running on schedule
- [ ] API response time <3s (fresh) / <500ms (cached)

### Post-P05
- [ ] Import pipeline deduplicating artists correctly
- [ ] Event calendar showing upcoming exhibitions
- [ ] Admin UI tested and ready for team

### Post-P06 (Ready for Production)
- [ ] All SLOs met (p95 <200ms, error <0.1%)
- [ ] Monitoring and alerting operational
- [ ] Team trained and documentation complete
- [ ] Beta launch (10%) successful
- [ ] Ready for 100% production release

---

## Key Dependencies & Blockers

```
P02 (Redis) ✅
    ↓
P03 (Trending) ✅
    ↓
P04 (Predictions) ← Depends on P03
    ↓
P05 (Onboarding) ← Can run parallel with P04 (only depends on P02)
    ↓
P06 (Launch) ← Depends on P05
```

**Note**: P05 can start immediately after P02 (parallel with P03-P04)

---

## High-Risk Items

| Risk | Phase | Mitigation |
|------|-------|-----------|
| ML service (Replicate) unavailable | P04 | 7-day cache + fallback to cached data |
| Low prediction accuracy (<75%) | P04 | Backtest before launch, refine in future phases |
| Import deduplication bugs | P05 | Fuzzy matching + manual review queue |
| Rate limiting on external APIs | P05 | Request budgeting, exponential backoff |
| Performance degradation | P06 | Load testing, query profiling, caching tuning |
| Schema migration data loss | P06 | Dry-run, backup, reversible script, validation |

---

## Success Definition

**All phases complete with**:
- ✅ Green exit criteria met for each phase
- ✅ All tests passing (unit + integration + E2E)
- ✅ SLOs met: p95 <200ms, error <0.1%, uptime 99.95%
- ✅ Team trained and documentation complete
- ✅ Beta launch successful (10% users, >80% positive feedback)
- ✅ Production release to 100% users stable

**Expected**: Production launch by end of Phase P06 (~11 weeks from P02 start)

---

## Phase Metrics at a Glance

| Phase | Confidence | Robustness | Complexity | Risk |
|-------|-----------|-----------|-----------|------|
| P04 | 75% | 70% | Med-High | Ext dependency |
| P05 | 85% | 80% | High | Dedup logic |
| P06 | 85% | 80% | Medium | Migration |

---

## Next Steps

1. **Review P04 Briefing**: `/plans/P04_PHASE_BRIEFING.md`
2. **Start P04**: Replicate.com account setup
3. **Plan P05**: Coordinate with team for import sources
4. **Schedule P06**: Plan monitoring setup and launch window

---

**Questions?** See detailed phase briefings in `/plans/` directory.
