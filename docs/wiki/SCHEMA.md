---
date: 2026-06-08
type: meta
tags: [conventions, wiki-structure, standards]
---

# Wiki Schema: Page Types & Conventions

All wiki pages follow a standard frontmatter and structure. This ensures consistency and enables automated tooling.

---

## Frontmatter

Every page starts with YAML:

```yaml
---
date: YYYY-MM-DD
type: [entity|concept|architecture|decision|guide]
tags: [comma, separated, tags]
---
```

| Field | Required | Values |
|-------|----------|--------|
| `date` | Yes | Last updated date (YYYY-MM-DD) |
| `type` | Yes | See table below |
| `tags` | Yes | Keywords for search/filtering |

### Page Types

| Type | Purpose | Examples |
|------|---------|----------|
| `entity` | Named system component with public interface | Trending System, Art Search, Redis Cache, Prisma ORM |
| `concept` | Cross-cutting pattern or design philosophy | Caching Strategy, Multi-Window Problem, Artist Ranking |
| `architecture` | System interaction and composition patterns | Data Flow, API Versioning, Cache Invalidation |
| `decision` | Recorded design choice with rationale & alternatives | "Why CockroachDB", "Why Hourly Cron", "Why Separate Metrics Table" |
| `guide` | Operational or implementation guide | "How to Debug Trending", "Running Migrations" |

---

## Entity Page Structure

```markdown
# entity-name

Brief one-liner describing what this is.

## Overview
- What is it?
- Where does it live (file paths)?
- Who uses it?

## Public Interface
### Input
- What data does it accept?
- Type signatures or examples

### Output
- What does it return/produce?
- Success and failure cases

## Dependencies
- External services (Redis, Firestore, Prisma)
- Other entities
- Third-party libraries

## Implementation Details
- How does it work internally?
- Key algorithms or business logic
- Performance characteristics

## Testing
- Unit test coverage
- Integration test points
- Known gaps

## Known Issues & Todos
- Current limitations
- Bug reports
- Roadmap items
- Technical debt

## Related Pages
- [[concept-...]] — Link to relevant concepts
- [[decision-...]] — Link to design decisions
- [[entity-...]] — Link to related entities
```

---

## Concept Page Structure

```markdown
# concept-name

One-liner: what's the pattern?

## Overview
- What problem does this concept address?
- Where does it appear in the codebase?
- Why is it important?

## Core Idea
- Explain the pattern in plain English
- What's the mental model?

## Examples in ZXY3
- At least 2-3 concrete examples from the codebase
- Code snippets or architecture diagrams

## Tradeoffs
- Pros of this approach
- Cons or limitations
- When to apply vs. when to avoid

## Related Concepts
- [[concept-...]] — Other patterns that interact
- [[decision-...]] — Decisions that rely on this concept
- [[entity-...]] — Entities that implement this
```

---

## Architecture Page Structure

```markdown
# architecture-name

One-liner: what interaction does this describe?

## System Diagram
ASCII diagram or description of data flow

```text
Component A
    → (describe interaction)
Component B
    → (describe interaction)
Component C
```

## Components & Roles
Table or description of each component's role

## Data Flow
- Step 1: Input comes in
- Step 2: Processing happens
- Step 3: Output goes out
- Error handling flow

## Timing & Concurrency
- Synchronous or async?
- Parallel operations?
- Lock/queue management?

## Scaling Characteristics
- How does this scale with data size?
- Caching or indexing strategy?
- Known bottlenecks?

## Related Entities
- [[entity-...]] — Uses this pattern
```

---

## Decision Page Structure

```markdown
# decision-name

One-liner: what was decided?

## Context
- What problem was this decision made to solve?
- When was it made (approximately)?
- Who was involved?

## Decision
- What did we choose?
- How is it implemented?

## Rationale
- Why this choice over alternatives?
- What constraints guided us?

## Alternatives Rejected
### Alternative 1: [name]
- How would this work?
- Why we didn't choose it

### Alternative 2: [name]
- ...

## Validation
- How do we know this works?
- Metrics or tests that confirm it?
- Edge cases we've tested?

## Status
- `Implemented` — In production
- `Planned` — Approved, not yet shipped
- `Revisit` — Working but needs re-evaluation
- `Deprecated` — No longer used

## Consequences & Debt
- What costs have we incurred?
- What trade-offs became apparent?
- Do we regret this decision?

## Related
- [[concept-...]] — Concept this relies on
- [[entity-...]] — Entity that implements this
- [[decision-...]] — Related decisions
```

---

## Linking Convention

Use `[[page-name]]` to link to other wiki pages (Markdown-style). Example:

```markdown
This entity uses the [[concept-caching-strategy]] pattern.
See [[decision-cockroachdb-choice]] for why we picked this DB.
Related: [[entity-trending-system]]
```

The wiki engine (or LLM reading this) resolves links. `page-name` should match the filename without `.md`.

---

## Tagging Convention

Tags are comma-separated, lowercase, kebab-case:

Common tags:
- `trending` — Related to trending/ranking system
- `search` — Related to art/artist search
- `cache` — Caching strategies or implementations
- `database` — Data storage, schema, migrations
- `api` — API endpoints, versioning, contracts
- `performance` — Optimization, bottlenecks, scaling
- `architecture` — System design, composition
- `production` — Live issues, monitoring, reliability

---

## raw/ Folder Convention

The `raw/` folder contains immutable source documents:
- Original architecture specifications
- Migration guides & changelogs
- Expert reviews or post-mortems
- Design constraints from stakeholders
- Performance benchmarks

**LLM Rule**: Read files in `raw/`, never modify. They're historical references.

Naming convention:
- `YYYY-MM-DD_name.md` for time-sensitive docs
- `PROJECT_GUIDE.md` for comprehensive references
- `INCIDENT_YYYY-MM-DD_description.md` for post-mortems

---

## Search & Query

### Find pages by type
- All entities: `grep "type: entity" *.md`
- All decisions: `grep "type: decision" *.md`
- All concepts: `grep "type: concept" *.md`

### Find by tag
- `grep "cache" *.md` finds all cache-related pages
- `grep "trending" *.md` finds all trending-related pages

### Cross-references
- `grep "\[\[" *.md` finds all internal links (useful for finding broken references)

---

## Example: Complete Entity Page

```yaml
---
date: 2026-06-08
type: entity
tags: [trending, ranking, metrics, redis, database]
---

# entity-trending-system

Real-time artist ranking across 3 time windows (7d/30d/90d).

## Overview
Tracks artist engagement (views, searches, market mentions) and computes hourly rankings. Results cached in Redis, served via public API. Powers the trending leaderboard.

## Public Interface
### Endpoints
- `GET /api/v2/trending/artists?window=7d&limit=100&offset=0`
- `POST /api/v2/admin/cron/trending/run-now` (protected)
- `GET /api/v2/admin/cron/trending/status` (protected)

### Input
- `window`: "7d" | "30d" | "90d"
- `limit`: 1-1000, default 100
- `offset`: pagination offset

### Output
```json
{
  "artists": [
    {
      "rank": 1,
      "artistId": "...",
      "name": "Alice",
      "trendScore": 85.5,
      "percentile": 99.5,
      "metrics": { "views": 1000, "searches": 500, "mentions": 200 }
    }
  ],
  "total": 67,
  "window": "7d"
}
```

## Dependencies
- Prisma ORM → `ArtistMetrics` table
- Redis → Result caching (TTL 1h)
- node-cron → Hourly scheduler
- CockroachDB → Persistence

## Implementation Details
Scoring formula:
```text
trendScore = (views × 0.5) + (searches × 0.3) + (mentions × 0.2)
```
Ranked descending within each window. Percentile calculated against full artist cohort.

See `lib/trending/scorer.js` for implementation.

## Known Issues
- Metrics are seeded with fake data, not real user events
- Cron doesn't auto-start on server boot; must be manually triggered
- No per-user trending (only global rankings)

## Related
- [[entity-artist-metrics-table]] — Data source
- [[concept-multi-window-ranking]] — Why 7d/30d/90d?
- [[decision-hourly-cron]] — Why hourly recompute?
```

---

## Maintenance Checklist

Before publishing a new wiki page:
- [ ] Frontmatter complete (date, type, tags)
- [ ] One-liner heading explains purpose
- [ ] All required sections present (see page-type template)
- [ ] At least 2-3 concrete examples or code snippets
- [ ] Links to related pages (using `[[...]]` syntax)
- [ ] No broken references (validate against existing pages)
- [ ] Spell-check and grammar

---

## References

- [[ORIGIN]] — Why this wiki pattern exists
- [[index]] — Navigation hub and full page listing
