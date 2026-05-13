-- ============================================================
-- Phase P01: Extended Schema Migration
-- Created: 2026-01-11
-- Description: Add v2 schema tables for artist metadata,
--              trending metrics, predictions, and events
--              while maintaining backward compatibility
-- ============================================================

-- ============================================================
-- STEP 1: Create Enum Types
-- ============================================================

CREATE TYPE source_type_enum AS ENUM (
  'api',
  'csv_upload',
  'ics_feed',
  'web_scrape'
);

CREATE TYPE metric_window_enum AS ENUM (
  '7d',
  '30d',
  '90d'
);

CREATE TYPE prediction_period_enum AS ENUM (
  '1Y',
  '3Y',
  '5Y',
  '10Y'
);

CREATE TYPE event_type_enum AS ENUM (
  'solo_exhibition',
  'group_show',
  'residency',
  'art_fair',
  'sale_event'
);

CREATE TYPE audit_action_enum AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE'
);

CREATE TYPE interaction_type_enum AS ENUM (
  'view',
  'search'
);

-- ============================================================
-- STEP 2: Create New Tables (v2 Schema)
-- ============================================================

-- Artists table: Core artist metadata
CREATE TABLE artists (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  "portfolioUrl" VARCHAR(500),
  "instagramHandle" VARCHAR(100),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "createdBy" VARCHAR(100),
  UNIQUE (name),
  INDEX idx_name (name)
);

-- Gallery sources: Track data provenance
CREATE TABLE gallery_sources (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  "apiEndpoint" VARCHAR(500),
  "apiKeyEncrypted" VARCHAR(500),
  "sourceType" source_type_enum NOT NULL,
  "lastSyncAt" TIMESTAMP,
  "syncFrequencyHours" INT DEFAULT 24,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  INDEX idx_is_active ("isActive")
);

-- Artworks: Main artwork data, refactored from mytable
CREATE TABLE artworks (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  "artistId" BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  medium1 VARCHAR(50) NOT NULL,
  medium2 VARCHAR(50),
  "priceRange" VARCHAR(20),
  "sourceId" BIGINT REFERENCES gallery_sources(id),
  "externalId" VARCHAR(255),
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  INDEX idx_artist_id ("artistId"),
  INDEX idx_source_id ("sourceId"),
  UNIQUE ("externalId", "sourceId")
);

-- Artist metrics: Trending rankings computed on schedule
CREATE TABLE artist_metrics (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  "artistId" BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  "metricWindow" metric_window_enum NOT NULL,
  "viewCount" INT DEFAULT 0,
  "searchFrequency" INT DEFAULT 0,
  "marketMentions" INT DEFAULT 0,
  "trendingRank" INT,
  "computedAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("artistId", "metricWindow")
);

-- Price predictions: ML-powered valuations
CREATE TABLE price_predictions (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  "artistId" BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  "predictionPeriod" prediction_period_enum NOT NULL,
  "predictedValue" DECIMAL(12, 2),
  "confidenceLower" DECIMAL(12, 2),
  "confidenceUpper" DECIMAL(12, 2),
  "modelVersion" VARCHAR(50),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("artistId", "predictionPeriod")
);

-- Artist events: Upcoming exhibitions and shows
CREATE TABLE artist_events (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  "artistId" BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  "eventTitle" VARCHAR(255) NOT NULL,
  "eventType" event_type_enum NOT NULL,
  "eventDate" DATE NOT NULL,
  "eventEndDate" DATE,
  "venueName" VARCHAR(255),
  "venueLocation" VARCHAR(500),
  description TEXT,
  "sourceUrl" VARCHAR(500),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  INDEX idx_artist_date ("artistId", "eventDate")
);

-- Audit log: Compliance and debugging
CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  "tableName" VARCHAR(50) NOT NULL,
  "recordId" BIGINT NOT NULL,
  action audit_action_enum NOT NULL,
  "oldValues" JSONB,
  "newValues" JSONB,
  "changedBy" VARCHAR(100),
  "changedAt" TIMESTAMP NOT NULL DEFAULT now(),
  INDEX idx_table_record ("tableName", "recordId"),
  INDEX idx_changed_at ("changedAt")
);

-- Events: User interaction tracking for trending
CREATE TABLE events (
  id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
  "artistId" BIGINT REFERENCES artists(id) ON DELETE SET NULL,
  "eventType" interaction_type_enum NOT NULL,
  "sessionId" UUID,
  timestamp TIMESTAMP NOT NULL DEFAULT now(),
  metadata JSONB,
  INDEX idx_artist_timestamp ("artistId", timestamp)
);

-- ============================================================
-- STEP 3: Note on Backward Compatibility
-- ============================================================
-- The original mytable is kept as-is for backward compatibility.
-- New code should use the artworks + artists tables instead.
-- Migration script will populate the new schema from mytable.
-- API routes will continue to work using compatibility layer.

-- ============================================================
-- STEP 4: Post-Migration Tasks (Run Separately)
-- ============================================================
-- These are handled by scripts/migrate_artworks_v1_to_v2.js:
-- 1. Extract unique artists from mytable
-- 2. Insert into artists table (case-insensitive dedup)
-- 3. Map artworks: mytable -> artworks + artist FK
-- 4. Validate data integrity (row counts, FK constraints)
-- 5. Create backward compatibility view (optional)
