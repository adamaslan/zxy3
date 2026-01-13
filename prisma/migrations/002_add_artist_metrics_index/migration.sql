-- Step 4: Query Optimization - Add Database Indexes
-- Adds index on artist_metrics(artistId) for faster artist metric lookups

-- Add index for artist_metrics.artistId lookups
CREATE INDEX IF NOT EXISTS "artist_metrics_artistId_idx" ON "artist_metrics"("artistId");

-- Verify indexes are in place:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'artist_metrics';
