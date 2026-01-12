# ZXY Gallery API v2 Documentation

**Status:** DRAFT (Implementation in progress, Phase P02)
**Base Path:** `/api/v2`
**Version:** 2.0.0

## Overview

API v2 provides optimized endpoints for artwork, artist, trending, predictions, and event data. All responses are cached for performance.

## Authentication

Currently, all v2 endpoints are public (no authentication required). Auth0 integration is maintained for admin operations.

## Response Format

All responses follow this structure:

```json
{
  "status": "success|error",
  "data": [],
  "error": null,
  "meta": {
    "total": 0,
    "limit": 20,
    "offset": 0,
    "cached": false,
    "cache_ttl": 3600
  }
}
```

## Endpoints

### Artworks

#### GET /artworks
List all artworks with optional filtering.

**Query Parameters:**
- `limit` (integer, default: 20, max: 100) - Results per page
- `offset` (integer, default: 0) - Pagination offset
- `artist_id` (string) - Filter by artist
- `medium` (string) - Filter by medium (case-insensitive substring)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "12345",
      "artist_id": "1",
      "medium1": "Oil on Canvas",
      "medium2": null,
      "price_range": "$5K-25K"
    }
  ],
  "meta": { "total": 156, "limit": 20, "offset": 0, "cached": true, "cache_ttl": 3600 }
}
```

**Cache:** 1 hour TTL

**Example:**
```bash
curl "http://localhost:3000/api/v2/artworks?limit=5&medium=oil"
```

#### GET /artworks/{id}
Retrieve a single artwork by ID.

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "12345",
    "artist_id": "1",
    "artist": { "name": "Artist Name", "bio": "..." },
    "medium1": "Oil on Canvas",
    "medium2": null,
    "price_range": "$5K-25K",
    "source_id": "1",
    "metadata": { "dimensions": "30x40in", "year": 2023 }
  }
}
```

**Cache:** 1 hour TTL

### Artists

#### GET /artists
List all artists.

**Query Parameters:**
- `limit` (integer, default: 20, max: 100)
- `offset` (integer, default: 0)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "1",
      "name": "Artist A",
      "bio": "Artist bio...",
      "portfolio_url": "https://artist.com",
      "instagram_handle": "@artist",
      "created_at": "2026-01-11T12:00:00Z"
    }
  ]
}
```

**Cache:** 24 hour TTL

#### GET /artists/{id}
Retrieve artist profile with metrics and events.

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "1",
    "name": "Artist A",
    "bio": "...",
    "portfolio_url": "https://artist.com",
    "instagram_handle": "@artist",
    "metrics": {
      "trending_rank": { "7d": 5, "30d": 12, "90d": 8 },
      "view_count": { "7d": 150, "30d": 500, "90d": 1200 }
    },
    "upcoming_events": 3
  }
}
```

**Cache:** 24 hour TTL

### Trending

#### GET /artists/trending
Get trending artists leaderboard.

**Query Parameters:**
- `window` (string: 7d|30d|90d, default: 30d) - Time window
- `limit` (integer, default: 50, max: 100) - Top N artists
- `offset` (integer, default: 0) - Pagination

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "trending_rank": 1,
      "artist_id": "1",
      "name": "Rising Artist",
      "view_count": 500,
      "search_frequency": 120
    }
  ],
  "meta": { "window": "30d", "computed_at": "2026-01-11T12:00:00Z" }
}
```

**Cache:** 12 hour TTL

**Example:**
```bash
curl "http://localhost:3000/api/v2/artists/trending?window=30d&limit=10"
```

### Predictions

#### GET /predictions/{artist_id}
Get value predictions for an artist across periods.

**Query Parameters:**
- `period` (string: 1Y|3Y|5Y|10Y, optional) - Specific period filter

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "artist_id": "1",
      "prediction_period": "1Y",
      "predicted_value": 5000,
      "confidence_lower": 4500,
      "confidence_upper": 5500,
      "model_version": "v1.0",
      "created_at": "2026-01-11T12:00:00Z"
    },
    { "prediction_period": "3Y", "predicted_value": 7500, ... },
    { "prediction_period": "5Y", "predicted_value": 12000, ... },
    { "prediction_period": "10Y", "predicted_value": 25000, ... }
  ]
}
```

**Cache:** 7 day TTL

**Example:**
```bash
curl "http://localhost:3000/api/v2/predictions/1?period=5Y"
```

### Events

#### GET /events
Get upcoming artist events.

**Query Parameters:**
- `artist_id` (string, optional) - Filter by artist
- `days` (integer, default: 90, max: 365) - Look-ahead days
- `format` (string: json|ics, default: json) - Response format

**Response (JSON):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "1",
      "artist_id": "1",
      "event_title": "Solo Exhibition",
      "event_type": "solo_exhibition",
      "event_date": "2026-02-15",
      "event_end_date": "2026-03-15",
      "venue_name": "Local Gallery",
      "venue_location": "City, State"
    }
  ]
}
```

**Response (iCalendar format):**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ZXY Gallery//Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:event-1@zxygallery.com
DTSTAMP:20260111T120000Z
DTSTART:20260215
SUMMARY:Solo Exhibition
LOCATION:Local Gallery, City
END:VEVENT
END:VCALENDAR
```

**Cache:** 4 hour TTL

**Example:**
```bash
# JSON format
curl "http://localhost:3000/api/v2/events?artist_id=1&days=90"

# iCalendar format (for Google Calendar, Outlook)
curl "http://localhost:3000/api/v2/events?format=ics" > events.ics
```

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameter",
    "details": { "limit": "Must be ≤100" }
  }
}
```

### 404 Not Found
```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Artist not found",
    "resource_id": "99999"
  }
}
```

### 429 Too Many Requests
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests",
    "retry_after": 60
  }
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Rate Limiting

- **Public endpoints:** ≤100 requests/minute per IP
- **Authenticated endpoints:** ≤1000 requests/hour per user

Rate limit headers:
- `X-RateLimit-Limit`: Requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Caching

All v2 endpoints use HTTP caching headers:

```
Cache-Control: public, max-age=3600
ETag: "abc123"
Last-Modified: Mon, 11 Jan 2026 12:00:00 GMT
```

Clients should respect these headers for optimal performance.

## Backward Compatibility

v1 endpoints (`/api/artworks`, `/api/search`) remain available and unchanged. New applications should use v2.

## Changelog

### v2.0.0 (2026-01-11)
- Initial release
- Trending artists endpoint
- Value predictions
- Event calendar
- Improved caching
