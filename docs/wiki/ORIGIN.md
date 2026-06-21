---
date: 2026-06-08
type: meta
tags: [philosophy, wiki-design, llm-maintained]
---

# Wiki Design Philosophy: ZXY Gallery

## Why This Wiki Exists

ZXY Gallery is a complex, evolving system with **live production traffic**, **database migrations**, **API versioning**, and **multiple caching layers**. Traditional documentation breaks down under this complexity because:

1. **Monolithic docs** (single README) don't scale — art discovery + trending + predictions + caching all need separate mental models
2. **Code is the source of truth, but code doesn't explain intent** — why is there a Redis cache here but not there? Why BigInt for metrics?
3. **Decisions fade into history** — "why do we compute trending hourly?" gets buried in git log
4. **Architectural diagrams rot** — they're never updated when code changes

This wiki solves these problems by being **LLM-maintained**: entities and concepts are auto-generated from production code, updated continuously, and always in sync with reality.

---

## Three-Layer Architecture

### Layer 1: Entities (Code-Coupled)
One page per named system component. These are the **source of truth** — they describe:
- What the component is (one sentence)
- Where it lives (file path)
- What it does (public interface)
- Its external dependencies (APIs, databases, caches)
- Known issues or TODOs

Entities are automatically derived from code structure. When code changes, entities should be reviewed.

**Examples**: Trending System, Art Search, Predictions, Redis Cache, API v2

### Layer 2: Concepts (Cross-Cutting)
Patterns and design philosophy that span multiple entities.

- **Data models** — how art/artist/metrics flow through the system
- **Caching strategies** — when to use Redis, when Prisma ORM, when Firestore
- **Scaling decisions** — why we compute trending hourly instead of on-demand
- **Multi-window problem** — why 7d/30d/90d windows, and the bucketing tradeoffs

Concepts help readers understand the *why* behind entity interactions.

### Layer 3: Decisions
Recorded design choices with:
- **Rationale** — why we chose this
- **Alternatives rejected** — what we didn't do and why
- **Validation** — how we know it works
- **Status** — implemented, planned, revisit, deprecated

Examples: "Why Prisma + CockroachDB" vs "Why not a pure graph DB?", "Why compute trending hourly?", "Why separate ArtistMetrics table?"

---

## How to Use This Wiki

### For New Developers
1. Read `overview.md` to see the full system map
2. Read the entity page for your area (e.g., `entity-trending-system.md`)
3. Read related concepts for the *why*
4. Dive into code with the entity page as your map

### For Architects
1. Read all Concepts pages (5 min each)
2. Read Decisions pages to understand tradeoffs
3. Check recent decisions to spot inconsistencies or debt

### For Debugging
1. Find the entity that's misbehaving
2. Read "Known Issues" section
3. Check `raw/` for detailed operational guides

### For Planning
1. Read Decisions to understand constraints
2. Read Concepts to spot where new features fit
3. Check open issues in entity pages

---

## Why This Pattern Works

**Traditional docs are write-once, read-once**: someone documents a feature, then code diverges, and the doc becomes lies.

**LLM-maintained wikis are continuous**: 
- Entities are derived from code structure, not hand-written prose
- When a component is renamed, its entity page updates
- When a new database table is added, the data-model concept is revisited
- Decisions are explicit checkpoints: "did we validate this?"

The wiki is **not code documentation** (that's docstrings). It's **architectural narrative** — helping you understand what the code *means* and *why it's organized that way*.

---

## Maintenance

### What Claude Updates Automatically
- Entity pages when code structure changes
- Concept pages when cross-cutting patterns shift
- Integration points between entities

### What You Update
- Decisions (when you make a choice)
- Validation status (when you test an assumption)
- Known issues (when you find a bug)
- Roadmap (when priorities shift)

### What Never Changes (raw/)
The `raw/` folder contains immutable source documents:
- Original architecture specs
- Migration guides
- Expert reviews
- Design constraints

These are read-only references. They anchor decisions in historical context.

---

## Reading Order

1. **First time here?** → `Welcome.md` + `index.md`
2. **Want the big picture?** → `overview.md`
3. **Diving into trending?** → `entity-trending-system.md` → related concepts
4. **Curious about caching?** → `concept-caching-strategy.md` → entity pages that use it
5. **Want all the reasoning?** → `DECISIONS.md` (index of all decisions)
6. **Need operational playbooks?** → `raw/` folder

---

## Links & References

- [[SCHEMA]] — wiki conventions and ingest/query/lint workflows
- [[overview]] — complete system map, tech stack, data flow
- Raw docs: `/docs/wiki/raw/` — immutable source materials
