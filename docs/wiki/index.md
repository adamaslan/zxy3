---
date: 2026-06-08
type: index
tags: [index, navigation]
---

# ZXY Gallery Wiki Index

_Last updated: 2026-06-08_

Read this file first on any query to find relevant pages, then drill in. For wiki philosophy see [[ORIGIN]]. For conventions see [[SCHEMA]].

---

## Overview

- [[overview]] — system map, tech stack, component hierarchy, data flow, current health

---

## Entities

One page per named system component. These are the hubs — concepts and decisions link to them.

- [[entity-trending-system]] — Artist ranking across 7d/30d/90d windows, hourly cron, Redis caching
- [[entity-art-search]] — Elasticsearch/vector search for artworks, filtering, pagination
- [[entity-api-v2]] — RESTful endpoints for artworks, artists, trending, predictions
- [[entity-predictions]] — ML-powered artwork value predictions (1/3/5/10-year horizons)
- [[entity-redis-cache]] — Multi-layer caching strategy: trending results, search indices, session data
- [[entity-prisma-orm]] — Database abstraction, migrations, type-safe queries
- [[entity-cockroachdb]] — PostgreSQL-compatible distributed database, schema design

---

## Concepts

Cross-cutting patterns and design philosophy.

- [[concept-caching-strategy]] — When to use Redis, Prisma cache, Firestore, and application cache
- [[concept-multi-window-ranking]] — Why compute 7d/30d/90d separately; bucketing and retention
- [[concept-artist-metrics]] — How we track views, searches, market mentions; data grain
- [[concept-event-flow]] — User actions → metrics updates → ranking recompute → cache invalidation
- [[concept-api-versioning]] — v1 (legacy) vs v2 (modern) endpoints; migration path

---

## Architecture

How components compose and interact.

- [[architecture-data-flow]] — End-to-end: user action → metric → ranking → cache → response
- [[architecture-trending-pipeline]] — Computation flow, cron scheduling, result persistence
- [[architecture-search-indexing]] — Art/artist search: indexing strategy, query execution, result ranking

---

## Decisions

Recorded design choices with rationale, alternatives rejected, and validation history.

- [[decision-cockroachdb]] — Why distributed PostgreSQL over Postgres, MySQL, or NoSQL
- [[decision-hourly-trending]] — Why compute rankings every hour (not on-demand or daily)
- [[decision-separate-metrics-table]] — Why ArtistMetrics is separate from Artist table
- [[decision-redis-for-trending]] — Why Redis cache trending results instead of computing on-demand
- [[decision-api-v2-design]] — Why v2 endpoints differ from v1; migration strategy

---

## Guides

Operational and implementation guides.

- [[guide-debugging-trending]] — How to diagnose ranking computation issues
- [[guide-running-migrations]] — Database schema updates, rollback strategy
- [[guide-local-development]] — Setup, env vars, running services locally

---

## Incidents

Production bugs and significant failures. Each incident links to the entity pages it affected.

_(None recorded yet — create `incident-YYYY-MM-DD-name.md` when issues occur)_

---

## Slash Commands

_Coming soon — integration with project guidance system_

---

## Sources (raw/)

Immutable source documents. LLM reads; never modifies.

| File | What it is |
|------|-----------|
| `raw/ARCHITECTURE_OVERVIEW.md` | Complete system map and component relationships |
| `raw/TRENDING_SYSTEM_DEEP_DIVE.md` | Detailed trending computation, cron scheduling, caching |
| `raw/API_V2_SPEC.md` | Complete API documentation from `docs/API_V2.md` |
| `raw/SCALABILITY_IMPROVEMENTS.md` | Performance optimization roadmap |

---

## Meta

- [[SCHEMA]] — wiki conventions, page types, required sections
- [[ORIGIN]] — philosophy: why LLM-maintained wikis work
- [[Welcome]] — home page with system status and quick navigation

---

## Quick Stats

| Aspect | Count |
|--------|-------|
| Entities | 7 |
| Concepts | 5 |
| Architecture docs | 3 |
| Decisions | 5 |
| Guides | 3 |
| Raw source docs | 4 |
