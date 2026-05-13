# Ingestion Optimization: Phase 1 Progress & Strategy Report

## 1. Executive Summary: The "Option A" Pivot
We are currently executing **Phase 1 (Conversational Extraction)**. Based on the scale of the 1,000-artist target, we have moved to **Option A: Rapid Name & Exhibition Extraction**.

### The Core Strategy
Instead of spending hours manually searching for individual artist websites and CVs upfront, we are focusing on:
1.  **Bulk extraction** of artist names and exhibition contexts from gallery archives.
2.  **Semi-automated upserting** (Phase 2) to establish the base records.
3.  **Phase 3 Enrichment** via the Artsy API to automatically backfill:
    *   Artist websites and Instagram handles.
    *   Biographies and nationalities.
    *   High-quality profile images.
    *   Comprehensive exhibition histories and sales metrics.

This approach is roughly **5-10x faster** than manual searching and leverages our existing `enrich-artists-artsy.js` script to do the heavy lifting.

---

## 2. Seed Gallery Status Tracker

We have processed or identified data for **9 out of 10** seed galleries. MoMA is currently excluded from the extraction loop per request to maintain a bounded dataset.

| Gallery | Segment | Status | Est. Artists | Data Source |
| :--- | :--- | :--- | :---: | :--- |
| **Tiger Strikes Asteroid** | Emerging | ✅ DONE | 56 | Web Archive (NY Past) |
| **15 Orient** | Mid-Career | ✅ DONE | 29 | Sidebar Archive |
| **Underdonk** | Emerging | 📝 Extracted | ~45 | Exhibitions Page |
| **Tempest on Weirfield** | Emerging | 📝 Extracted | ~30 | Past Shows |
| **King's Leap** | Mid-Career | 📝 Extracted | ~15 | Web Search / Site |
| **Microscope Gallery** | Mid-Career | 📝 Extracted | ~60 | Exhibitions List |
| **Luhring Augustine** | Established | 📝 Extracted | ~50 | Past Exhibitions |
| **Magenta Plains** | Established | 📝 Extracted | ~20 | Artist Roster |
| **Tanya Bonakdar** | Late-Career | 📝 Extracted | ~50 | Exhibitions Archive |
| **MoMA** | Late-Career | ⏸️ SKIPPED | - | - |

**Current Total Artists Identified:** ~355

---

## 3. Implementation Details: Option A Workflow

### Phase 1: Rapid Extraction (Current)
We are bypasssing the "manual research" step for individual artists. 
*   **Goal:** Capture `{ name, gallery, exhibition_year }`.
*   *Artifacts:* `data/extracted-[gallery].json` files.

### Phase 2: Database Ingestion (Next)
Claude will write `scripts/ingest-phase2-upsert.js` to:
1.  Read all JSON files in `data/`.
2.  Create/Update `Gallery` records.
3.  Create/Update `Artist` records with `career_stage` based on the gallery's tier.
4.  Track progress in `ingestion_status.json`.

### Phase 3: Autonomous Enrichment
Run the existing script:
```bash
npm run enrich-artists
```
This script uses the artist names to query Artsy, which has consistently higher data quality for URLs, bios, and social handles than what can be reliably scraped from individual boutique gallery websites.

---

## 4. Why We Skipped the "Individual Search" Phase
During our research for **Tiger Strikes Asteroid**, we found that:
*   **Ambiguity:** Common names (e.g., "Miguel Martinez") produce multiple conflicting results.
*   **Maintenance:** Artist websites change frequently; Artsy maintains updated links.
*   **Format:** Many artists lack a structured "website" but have verified profiles on aggregate platforms.
*   **Efficiency:** We can enrich 500 artists via API in the same time it takes to manually find 10 websites.

---

## 5. Next Steps

1.  **Generate Extractions:** I will now finalize the remaining JSON files for Underdonk, Tempest, King's Leap, Microscope, Luhring Augustine, Magenta Plains, and Tanya Bonakdar.
2.  **Phase 2 Script:** Once all JSONs are ready, I will generate the Prisma upsert script.
3.  **Run Ingestion:** We will execute the ingestion and verify the `Artist` counts in the database.

> [!TIP]
> This strategy ensures we hit the **1,000-artist target** by focusing on volume first, followed by automated quality enrichment, rather than getting bogged down in individual record research.
