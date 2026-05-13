# Claude Chat Ingestion Plan

## Goal

Build a CSV of all artists represented by **Luhring Augustine**, **Magenta Plains**, and **Tanya Bonakdar Gallery**, including each artist's personal website where available.

---

## Galleries

| Gallery | Location | Artist Count |
|---------|----------|:-----------------:|
| Luhring Augustine | Chelsea + Tribeca, NYC | 50 (32 primary + 18 secondary/estate) |
| Magenta Plains | Lower East Side, NYC | 19 (16 primary + 3 estate/archive) |
| Tanya Bonakdar Gallery | Chelsea, NYC + Los Angeles | 45 (all primary) |
| **Total** | | **114 artists** |

---

## Plan

### Phase 1 -- Research (this chat session)

| Step | Method | Status |
|------|--------|--------|
| 1a. Luhring Augustine artist roster | Web search + gallery site | Done (50 artists) |
| 1b. Magenta Plains artist roster | Web search + gallery site | Done (19 artists) |
| 1c. Tanya Bonakdar artist roster | Web search + gallery site | Done (45 artists) |
| 1d. Artist personal websites | Web search per artist | Partial -- Magenta Plains + Tanya Bonakdar have websites; Luhring Augustine needs enrichment |

### Phase 2 -- Website Enrichment

For artists missing a website after Phase 1:
1. Search `"<artist name>" artist website` via web search
2. Check Artsy artist pages (`artsy.net/artist/<slug>`) for linked websites
3. Fall back to Instagram or portfolio platforms if no standalone site

### Phase 3 -- CSV Output

Write `data/gallery-artists-research.csv` with columns:

```
artist_name, gallery, representation_type, website
```

- `representation_type`: `primary`, `secondary/estate`, or `exhibited`
- `website`: artist's personal site URL, or blank if not found

### Phase 4 -- Cross-reference with DB

Check which artists already exist in the ZXY database (67 current artists listed in ingestion-cowork-plan.md). Flag overlaps to avoid duplicates during future ingestion.

---

## Tools Used

| Tool | Purpose |
|------|---------|
| Web Search | Gallery rosters, artist websites |
| Artsy API | Cross-reference artist slugs and websites |
| Claude subagents | Parallel research across all three galleries |
| CSV write | Final output to `data/` folder |

---

## Output

- **CSV**: `data/gallery-artists-research.csv`
- **This plan**: `docs/claude-chat-ingestion-plan.md`

---

## Notes

- Luhring Augustine distinguishes "represented" vs "works by" (estates/secondary market) -- both included
- Magenta Plains includes several estate representations (Barbara Ess, Paul Gardere, Stan VanDerBeek)
- Barbara Ess appears in both the existing ZXY DB and Magenta Plains roster -- overlap to flag
- Website coverage will vary; many emerging artists lack standalone sites
