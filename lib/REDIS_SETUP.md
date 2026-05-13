# Redis Integration Guide

## Overview

Redis has been integrated as the caching layer for the P02 phase. The implementation includes:

- **Redis Client Singleton** (`lib/redis.js`) - Managed connection with auto-reconnect
- **Cache Middleware** (`lib/middleware/redisCache.js`) - Production-grade caching with in-memory fallback
- **Graceful Degradation** - Works with or without Redis running

## Setup

### 1. Start Redis

**Option A: Docker (recommended)**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**Option B: Homebrew (macOS)**
```bash
brew install redis
redis-server
```

**Option C: Local Installation**
Download from [redis.io](https://redis.io/download)

### 2. Configure Connection

Default: `redis://localhost:6379`

Override with environment variable:
```bash
REDIS_URL=redis://username:password@host:port
```

## Usage

### Basic Redis Operations

```javascript
const redis = require('./lib/redis');

// Get
const value = await redis.get('key');

// Set with TTL (3600 seconds = 1 hour)
await redis.set('key', 'value', { EX: 3600 });

// Delete
await redis.del('key');

// Check existence
const exists = await redis.exists('key');

// Pattern-based deletion
await redis.deleteByPattern('artworks:*');

// Health check
const health = await redis.healthCheck();
```

### Using Redis Cache Middleware

```javascript
const { withRedisCache } = require('./lib/middleware/redisCache');

// Simple caching
export default withRedisCache(async (req, res) => {
  const data = await fetchData();
  return res.status(200).json(data);
}, {
  ttl: 3600,           // Cache for 1 hour
  key: 'artworks'      // Cache key prefix
});

// Custom key generation
export default withRedisCache(handler, {
  ttl: 3600,
  keyGenerator: (req) => `artworks:${req.query.limit}:${req.query.offset}`
});

// Combined with invalidation
export default withCombinedRedisCache(handler, {
  cache: { ttl: 3600, key: 'artworks' },
  invalidate: ['artworks:*', 'artists:*']  // Invalidate on mutation
});
```

## Features

### Connection Management
- **Auto-reconnect** with exponential backoff
- **Lazy initialization** on first use
- **Graceful degradation** if Redis unavailable
- **Health checks** and diagnostics

### Caching Strategy
- **Redis First** - Primary cache store
- **In-Memory Fallback** - Backup if Redis down
- **TTL Support** - Automatic key expiration
- **Pattern Invalidation** - Bulk cache clearing

### HTTP Cache Headers
- **Cache-Control**: `public, max-age=<ttl>`
- **Age**: Cache entry age in seconds
- **X-Cache**: `HIT-REDIS`, `HIT-MEMORY`, or `MISS`

## Testing

### Run Redis Tests
```bash
npm run test:unit -- redis.test.js
```

### Skip Redis Tests (if not running)
```bash
SKIP_REDIS_TESTS=true npm run test:unit -- redis.test.js
```

## Monitoring

### Check Redis Health
```bash
curl http://localhost:3000/api/v2/health 2>/dev/null | jq '.redis'
```

### View Cache Statistics
```bash
redis-cli INFO stats
```

### Clear All Cache (development only)
```bash
redis-cli FLUSHDB
```

## Integration with v2 API Endpoints

The v2 endpoints can be easily wrapped with caching:

```javascript
// pages/api/v2/artworks/index.js
import { withRedisCache } = require('../../../lib/middleware/redisCache');
import handler from './handler';

export default withRedisCache(handler, {
  ttl: 3600,           // 1 hour for artworks
  key: 'artworks:list',
  cacheable: (req, res, data) => res.statusCode === 200
});
```

## Configuration Presets

### Development
- TTL: 1 hour (3600s)
- Auto-fallback to in-memory
- Verbose logging

### Production
- TTL: 24 hours (86400s) for stable data
- Redis required for scale
- Error monitoring

## Troubleshooting

### Redis Connection Timeout
```
[Redis] Failed to connect: connect ECONNREFUSED
```
**Solution:** Start Redis server or check REDIS_URL

### Out of Memory
```
MISCONF Redis is configured to save RDB snapshots
```
**Solution:** Redis running out of memory - increase allocated space or clear cache

### Slow Queries
Check `Age` header - if missing, cache is missing hits.

## Next Steps (Phase P06: Cache Optimization)

- [ ] Cache key versioning for invalidation
- [ ] Cache warming on startup
- [ ] Metrics and monitoring (hit rate, latency)
- [ ] Cache-aside pattern for expensive queries
- [ ] Distributed cache coordination (clusters)

---

**Reference:** lib/redis.js, lib/middleware/redisCache.js
