---
date: 2026-06-08
type: guide
tags: [welcome, getting-started, navigation]
---

# Welcome to ZXY Gallery Wiki

Welcome! This wiki is your guide to the ZXY Gallery system — how it's built, why decisions were made, and how to navigate the codebase.

---

## What Is This?

This is an **LLM-maintained wiki** — a living document that describes the architecture, design decisions, and operational aspects of ZXY Gallery. Unlike traditional documentation that rots over time, this wiki is continuously updated to stay synchronized with the codebase.

**Key idea**: You shouldn't have to read code to understand *why* it's organized a certain way. This wiki explains the *what*, *how*, and *why*.

---

## Where to Start

### 👀 Just Want the Big Picture?
Read **[[overview]]** (10 min) — System architecture, tech stack, data flow, current health.

### 🔧 Debugging Something?
1. Find the entity (component) you're debugging: [[index]] → **Entities** section
2. Read its "Known Issues" section
3. Check related [[concept-...]] pages for context
4. Refer to the "See Also" links for source code locations

### 🏗️ Adding a Feature or Redesigning?
1. Read relevant **Concepts** pages to understand existing patterns
2. Check **Decisions** to see what alternatives were rejected (and why)
3. Look at **Architecture** pages to understand how components interact
4. Check open issues in entity pages

### 📚 Learning About a Specific System?
1. Go to [[index]] and find the entity (e.g., [[entity-trending-system]])
2. Read its overview, implementation details, and known issues
3. Follow "Related Pages" links to concepts and decisions
4. Dive into the source code with the entity page as your map

---

## Navigation

- **[[index]]** — Full wiki index (start here on any query)
- **[[overview]]** — System map, architecture, tech stack
- **[[SCHEMA]]** — Wiki conventions and page structure
- **[[ORIGIN]]** — Why this wiki pattern exists and how to use it

---

## Key Entities

### Core Features
- [[entity-trending-system]] — Artist rankings (7d/30d/90d windows, hourly)
- [[entity-art-search]] — Artwork discovery via text/vector search
- [[entity-api-v2]] — RESTful API endpoints
- [[entity-predictions]] — ML-powered value forecasts

### Infrastructure
- [[entity-redis-cache]] — Multi-layer caching strategy
- [[entity-prisma-orm]] — Database abstraction layer
- [[entity-cockroachdb]] — Distributed PostgreSQL database

---

## Key Concepts

- **[[concept-multi-window-ranking]]** — Why 7d/30d/90d windows?
- **[[concept-caching-strategy]]** — When to use Redis, Prisma, Firestore?
- **[[concept-event-flow]]** — How do user actions update metrics?
- **[[concept-artist-metrics]]** — How are views/searches/mentions tracked?
- **[[concept-api-versioning]]** — v1 vs v2 endpoints and migration

---

## Quick Reference

| I want to... | Read this |
|--------------|-----------|
| See the full architecture | [[overview]] |
| Understand trending system | [[entity-trending-system]] |
| Find a specific component | [[index]] → Entities section |
| Understand a design choice | [[index]] → Decisions section |
| Learn about a pattern | [[index]] → Concepts section |
| Debug an issue | Find entity → Known Issues |
| See code location | Entity page → "See Also" section |

---

## System Status

| Component | Status | Notes |
|-----------|--------|-------|
| Trending system | ✅ Live | Ranks updating hourly (seeded data) |
| Art search | ✅ Live | Elasticsearch-powered, sub-100ms |
| API v2 | ✅ Live | Fully functional, backward compatible |
| Predictions | ✅ Live | ML forecasts for featured artworks |
| Redis cache | ✅ Live | 98% hit rate on trending |
| Admin tools | ✅ Live | Manual cron control via API |
| Event ingestion | ⏳ Pending | Real user metrics (not yet implemented) |

---

## Common Questions

**Q: Where's the code?**  
A: Entity pages have "See Also" sections with file paths. Example: [[entity-trending-system]] links to `lib/trending/` and `lib/cron/`.

**Q: Why is this wiki different from README.md?**  
A: This wiki explains *architectural* decisions, not setup instructions. For local dev setup, see `docs/DEVELOPMENT.md`.

**Q: Can I edit this wiki?**  
A: Yes! Add new pages or update existing ones. Follow [[SCHEMA]] conventions. For LLM-generated content, the wiki generator (Claude) can auto-update entities/concepts/decisions.

**Q: What's in the raw/ folder?**  
A: Immutable source documents — historical specs, design constraints, post-mortems. These are references; don't modify them.

**Q: Is this production ready?**  
A: Yes, but not complete. Metrics are currently seeded (not real). Real event tracking is the main gap.

---

## Key Links

- **Live Site**: https://online.zxygallery.com
- **API Docs**: `docs/API_V2.md`
- **Trending Details**: `docs/trending-system.md`
- **Dev Setup**: `docs/DEVELOPMENT.md`
- **Roadmap**: `plans/zxy-modernization-roadmap.md`

---

## Need Help?

1. **Reading this wiki**: Check [[SCHEMA]] for page structure
2. **Finding something**: Use [[index]] or search by tag
3. **Understanding architecture**: Start with [[overview]]
4. **Debugging**: Find the entity, read "Known Issues"
5. **Contributing**: Follow [[SCHEMA]] conventions for new pages

---

## Philosophy

This wiki exists because **software systems are complex**, and traditional documentation doesn't keep pace with code. By organizing knowledge as:

- **Entities** (code-coupled) — tied to actual components
- **Concepts** (cross-cutting) — patterns that appear everywhere
- **Decisions** (with rationale) — why we chose this, not that

...we create documentation that *reasons* about the system, not just describes it. That's harder to ignore or let rot.

For more, see [[ORIGIN]].

---

Happy exploring! 🚀
