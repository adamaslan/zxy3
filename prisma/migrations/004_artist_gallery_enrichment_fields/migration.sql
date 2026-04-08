-- Migration 004: Artist & Gallery enrichment fields
-- Adds external data fields for website, CV, career stage, show counts,
-- Artsy/auction data, gallery tier, and new ArtistMetrics external columns.

-- artists: website/CV links, career classification, show counts, market data
ALTER TABLE artists ADD COLUMN IF NOT EXISTS cv_url TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS career_stage VARCHAR(20);
ALTER TABLE artists ADD COLUMN IF NOT EXISTS show_count_solo INT NOT NULL DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS show_count_group INT NOT NULL DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS artsy_url TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS artsy_id TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS highest_sale_price FLOAT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS highest_sale_currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS highest_sale_source VARCHAR(50);
ALTER TABLE artists ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS artsy_enriched_at TIMESTAMP;

-- galleries: tier based on career stage of artists shown
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS gallery_tier VARCHAR(20);

-- artist_metrics: external metrics (replace internal once populated)
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS instagram_followers INT;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS solo_show_count INT NOT NULL DEFAULT 0;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS group_show_count INT NOT NULL DEFAULT 0;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS highest_sale_price FLOAT;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS artsy_page_views INT;
