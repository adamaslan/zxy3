# Schema Migration Guide

**Status:** DRAFT (To be implemented in Phase P01)
**Target Release:** Week 2-3 of modernization roadmap

## Overview

This document describes the database schema changes and migration strategy for modernizing the ZXY Gallery database.

## Migration Strategy

The migration follows a **non-breaking, additive approach**:

1. New tables are created alongside existing `mytable`
2. Data is backfilled from `mytable` into new schema
3. Backward compatibility is maintained via views/queries
4. Original `mytable` is kept as read-only reference
5. Full rollback is possible if needed

## Current Schema (v1)

```sql
CREATE TABLE mytable (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  artist VARCHAR(255),
  medium1 VARCHAR(50),
  medium2 VARCHAR(50),
  price_range VARCHAR(20),
  INDEX idx_artist (artist)
);
```

## New Schema (v2)

### Table: artists
```sql
CREATE TABLE artists (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  portfolio_url VARCHAR(500),
  instagram_handle VARCHAR(100),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by VARCHAR(100),
  UNIQUE INDEX idx_name_lower (LOWER(name)),
  INDEX idx_instagram (instagram_handle)
);
```

Replaces the artist string field from `mytable`.

### Table: artworks
```sql
CREATE TABLE artworks (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  artist_id BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  medium1 VARCHAR(50) NOT NULL,
  medium2 VARCHAR(50),
  price_range VARCHAR(20),
  source_id BIGINT REFERENCES gallery_sources(id),
  external_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  INDEX idx_artist_id (artist_id),
  INDEX idx_source_id (source_id),
  UNIQUE INDEX idx_external_id (external_id, source_id)
);
```

Replaces `mytable` for ongoing use (original kept for reference).

### Table: gallery_sources
```sql
CREATE TABLE gallery_sources (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  api_endpoint VARCHAR(500),
  api_key_encrypted VARCHAR(500),
  source_type ENUM ('api', 'csv_upload', 'ics_feed', 'web_scrape'),
  last_sync_at TIMESTAMP,
  sync_frequency_hours INT DEFAULT 24,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  INDEX idx_is_active (is_active)
);
```

Tracks data provenance (which gallery source provided each artist/artwork).

### Table: artist_metrics
```sql
CREATE TABLE artist_metrics (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  artist_id BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  metric_window ENUM ('7d', '30d', '90d') NOT NULL,
  view_count INT DEFAULT 0,
  search_frequency INT DEFAULT 0,
  market_mentions INT DEFAULT 0,
  trending_rank INT,
  computed_at TIMESTAMP DEFAULT now(),
  UNIQUE INDEX idx_artist_window (artist_id, metric_window)
);
```

Stores trending artist rankings and metrics.

### Table: price_predictions
```sql
CREATE TABLE price_predictions (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  artist_id BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  prediction_period ENUM ('1Y', '3Y', '5Y', '10Y') NOT NULL,
  predicted_value DECIMAL(12, 2),
  confidence_lower DECIMAL(12, 2),
  confidence_upper DECIMAL(12, 2),
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE INDEX idx_artist_period (artist_id, prediction_period)
);
```

Stores ML-generated artwork value predictions.

### Table: artist_events
```sql
CREATE TABLE artist_events (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  artist_id BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  event_title VARCHAR(255) NOT NULL,
  event_type ENUM ('solo_exhibition', 'group_show', 'residency', 'art_fair', 'sale_event'),
  event_date DATE NOT NULL,
  event_end_date DATE,
  venue_name VARCHAR(255),
  venue_location VARCHAR(500),
  description TEXT,
  source_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT now(),
  INDEX idx_artist_date (artist_id, event_date)
);
```

Tracks upcoming artist exhibitions and events.

### Table: audit_log
```sql
CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  table_name VARCHAR(50) NOT NULL,
  record_id BIGINT NOT NULL,
  action ENUM ('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by VARCHAR(100),
  changed_at TIMESTAMP DEFAULT now(),
  INDEX idx_table_record (table_name, record_id),
  INDEX idx_changed_at (changed_at)
);
```

Maintains audit trail for all data mutations.

### Table: events (event tracking)
```sql
CREATE TABLE events (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  artist_id BIGINT REFERENCES artists(id),
  event_type ENUM ('view', 'search') NOT NULL,
  session_id UUID,
  timestamp TIMESTAMP DEFAULT now(),
  metadata JSONB,
  INDEX idx_artist_timestamp (artist_id, timestamp)
);
```

Tracks user interactions (views, searches) for analytics.

## Migration Steps

### Phase 1: Create New Tables

```sql
-- Create gallery_sources first (no dependencies)
CREATE TABLE gallery_sources (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  ...
);

-- Create artists table
CREATE TABLE artists (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  name VARCHAR(255) NOT NULL,
  ...
);

-- Create artworks table
CREATE TABLE artworks (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  artist_id BIGINT NOT NULL REFERENCES artists(id),
  ...
);

-- Create remaining tables
CREATE TABLE artist_metrics (...);
CREATE TABLE price_predictions (...);
CREATE TABLE artist_events (...);
CREATE TABLE audit_log (...);
CREATE TABLE events (...);
```

### Phase 2: Backfill Data

```javascript
// Extract unique artists from mytable
const uniqueArtists = await SELECT DISTINCT artist FROM mytable;

// Insert into artists (deduplicating case-insensitive names)
const artistMap = {};
for (const artist of uniqueArtists) {
  const exists = await SELECT id FROM artists
    WHERE LOWER(name) = LOWER(artist);
  if (!exists) {
    const newId = await INSERT INTO artists (name) VALUES (artist);
    artistMap[artist] = newId;
  } else {
    artistMap[artist] = exists.id;
  }
}

// Insert artworks with artist_id FK references
for (const row of mytable) {
  await INSERT INTO artworks (artist_id, medium1, medium2, price_range)
    VALUES (artistMap[row.artist], row.medium1, row.medium2, row.price_range);
}
```

### Phase 3: Validation

```sql
-- Verify row counts match
SELECT
  (SELECT COUNT(*) FROM mytable) as old_count,
  (SELECT COUNT(*) FROM artworks) as new_count;
-- Should show equal counts

-- Check for NULL artist_ids
SELECT COUNT(*) FROM artworks WHERE artist_id IS NULL;
-- Should show 0

-- Verify unique artist count
SELECT
  (SELECT COUNT(DISTINCT artist) FROM mytable) as old_artists,
  (SELECT COUNT(*) FROM artists) as new_artists;
-- Should show equal (or close, accounting for case-insensitive dedup)
```

### Phase 4: Backward Compatibility

Option A: Create view (read-only access)
```sql
CREATE VIEW mytable_v2_compatible AS
  SELECT
    a.id,
    a.name as artist,
    a.medium1,
    a.medium2,
    a.price_range
  FROM artworks a
  JOIN artists a2 ON a.artist_id = a2.id;
```

Option B: Update API to query new schema
```javascript
// pages/api/artworks.js
// Existing endpoint continues to work, now queries new schema:
const artworks = await prisma.artworks.findMany({
  include: { artist: { select: { name: true } } }
});

const result = artworks.map(a => ({
  id: a.id.toString(),
  artist: a.artist.name,
  medium1: a.medium1,
  medium2: a.medium2,
  price_range: a.price_range
}));
```

## Rollback Plan

If migration fails:

1. Drop new tables (data still exists in `mytable`)
```sql
DROP TABLE audit_log, events, artist_events,
           price_predictions, artist_metrics,
           artworks, artists, gallery_sources;
```

2. Restore from backup (if needed)
```bash
cockroach sql < backup.sql  # Restore from snapshot
```

## Testing

### Local Development
```bash
# Test migration on local/staging database
node scripts/migrate_artworks_v1_to_v2.js --dry-run --db=staging

# Validate results
npm run test:integration -- schema_migration.test.js

# Compare old vs. new API responses
curl http://localhost:3000/api/artworks | jq '.[0]'
curl http://localhost:3000/api/v2/artworks | jq '.data[0]'
# Should return same fields (after mapping new schema)
```

### Production
```bash
# Backup current database
cockroach dump zxy > backup_pre_migration.sql

# Run migration (with progress logging)
node scripts/migrate_artworks_v1_to_v2.js --db=production --log-progress

# Validate
node scripts/validate_migration.js --db=production
```

## Verification Checklist

- [ ] New tables created successfully
- [ ] Data backfilled (all rows migrated)
- [ ] Row counts match (old vs. new)
- [ ] No orphaned records (FK integrity)
- [ ] Audit log capturing DML
- [ ] Backward compatibility API working
- [ ] Old routes return same data
- [ ] Rollback plan tested
- [ ] Team trained on schema changes
