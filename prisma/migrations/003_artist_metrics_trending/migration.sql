-- Migration 003: Add trending columns to artist_metrics
-- The existing table has: artist_id, search_hits, profile_views, last_viewed
-- We need to add: metric_window, view_count, search_frequency, market_mentions, trending_rank
-- Then backfill metric_window and drop the constraint so we can have 3 rows per artist (one per window)

-- Step 0: Ensure base columns exist (may have been added outside migrations)
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS search_hits INT NOT NULL DEFAULT 0;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS profile_views INT NOT NULL DEFAULT 0;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS last_viewed TIMESTAMP;

-- Step 1: Add new columns
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS metric_window VARCHAR(10) NOT NULL DEFAULT '7d';
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS search_frequency BIGINT NOT NULL DEFAULT 0;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS market_mentions BIGINT NOT NULL DEFAULT 0;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS trending_rank BIGINT;
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP NOT NULL DEFAULT now();

-- Step 2: Backfill view_count and search_frequency from existing columns
UPDATE artist_metrics SET
  view_count = profile_views,
  search_frequency = search_hits;

-- Step 3: Drop old primary key (artist_id alone) so we can have multiple rows per artist
ALTER TABLE artist_metrics DROP CONSTRAINT IF EXISTS artist_metrics_pkey;

-- Step 4: Add a new id column as primary key
ALTER TABLE artist_metrics ADD COLUMN IF NOT EXISTS id BIGINT DEFAULT unique_rowid();

-- Step 5: Add unique constraint on (artist_id, metric_window)
CREATE UNIQUE INDEX IF NOT EXISTS artist_metrics_artist_window_idx ON artist_metrics(artist_id, metric_window);

-- Step 6: Set the new primary key
ALTER TABLE artist_metrics ADD PRIMARY KEY (id);

-- Step 7: Insert 30d and 90d rows for all existing artists (copying the 7d values)
INSERT INTO artist_metrics (artist_id, metric_window, view_count, search_frequency, market_mentions)
SELECT artist_id, '30d', view_count, search_frequency, market_mentions FROM artist_metrics WHERE metric_window = '7d'
ON CONFLICT (artist_id, metric_window) DO NOTHING;

INSERT INTO artist_metrics (artist_id, metric_window, view_count, search_frequency, market_mentions)
SELECT artist_id, '90d', view_count, search_frequency, market_mentions FROM artist_metrics WHERE metric_window = '7d'
ON CONFLICT (artist_id, metric_window) DO NOTHING;
