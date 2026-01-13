/**
 * Redis-Backed Caching Middleware
 *
 * Provides production-grade caching with:
 * - Redis as primary cache store
 * - In-memory fallback for reliability
 * - Configurable TTL per endpoint
 * - Efficient cache invalidation using pattern tracking
 * - HTTP cache headers (Age, Cache-Control)
 * - Graceful degradation if Redis unavailable
 *
 * Usage:
 * const cachedHandler = withRedisCache(handler, { ttl: 3600, key: 'artworks' });
 */

const redis = require('../redis');
const { InMemoryCache, generateCacheKey } = require('./cache');
const logger = require('../logger');

/**
 * Efficient pattern tracker for in-memory cache
 * Maintains a Map of pattern prefixes -> Set of keys for O(1) pattern lookup
 */
class PatternTracker {
  constructor() {
    this.patterns = new Map(); // pattern -> Set of keys
    this.keyToPatterns = new Map(); // key -> Set of patterns it belongs to
  }

  /**
   * Add a key with its pattern prefix
   * Extract pattern from key (e.g., 'trending:artists:7d:100:0' -> 'trending:artists')
   */
  addKey(key, pattern) {
    // Get base pattern from key (first two segments)
    const segments = key.split(':');
    const basePattern = segments.slice(0, 2).join(':') + ':*';

    // Add to patterns map
    if (!this.patterns.has(basePattern)) {
      this.patterns.set(basePattern, new Set());
    }
    this.patterns.get(basePattern).add(key);

    // Track which patterns this key belongs to
    if (!this.keyToPatterns.has(key)) {
      this.keyToPatterns.set(key, new Set());
    }
    this.keyToPatterns.get(key).add(basePattern);
  }

  /**
   * Remove a key from pattern tracking
   */
  removeKey(key) {
    const patterns = this.keyToPatterns.get(key);
    if (patterns) {
      for (const pattern of patterns) {
        const patternSet = this.patterns.get(pattern);
        if (patternSet) {
          patternSet.delete(key);
          if (patternSet.size === 0) {
            this.patterns.delete(pattern);
          }
        }
      }
      this.keyToPatterns.delete(key);
    }
  }

  /**
   * Get all keys matching a pattern in O(k) where k is matching keys
   * Much faster than checking all keys
   */
  getKeysMatchingPattern(pattern) {
    const results = new Set();

    // Convert simple pattern to regex (e.g., 'trending:artists:*' -> matching keys)
    const basePattern = pattern.split(':*')[0];

    // Find all patterns that start with the base
    for (const [patternKey, keys] of this.patterns) {
      if (patternKey.startsWith(basePattern)) {
        for (const key of keys) {
          results.add(key);
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Clear all patterns
   */
  clear() {
    this.patterns.clear();
    this.keyToPatterns.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalKeys = 0;
    for (const keys of this.patterns.values()) {
      totalKeys += keys.size;
    }
    return {
      patterns: this.patterns.size,
      totalKeys
    };
  }
}

/**
 * Fallback in-memory cache (used if Redis unavailable)
 */
const fallbackCache = new InMemoryCache();
const patternTracker = new PatternTracker();

/**
 * Gets value from cache (Redis first, then in-memory)
 *
 * @param {string} key - Cache key
 * @returns {Object|null} { value, age, ttl, source } or null
 */
async function getCached(key) {
  try {
    // Try Redis first
    const redisValue = await redis.get(key);
    if (redisValue) {
      logger.debug(`[Cache] Redis HIT: ${key}`);
      return {
        value: JSON.parse(redisValue),
        age: 0,
        ttl: null,
        source: 'redis'
      };
    }

    // Fall back to in-memory cache
    const memValue = fallbackCache.get(key);
    if (memValue) {
      logger.debug(`[Cache] Memory HIT: ${key}`);
      return {
        ...memValue,
        source: 'memory'
      };
    }

    return null;
  } catch (error) {
    logger.warn(`[Cache] Get failed for ${key}: ${error.message}`);
    return fallbackCache.get(key);
  }
}

/**
 * Sets value in cache (Redis + in-memory for reliability)
 *
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<boolean>}
 */
async function setCached(key, value, ttlSeconds) {
  try {
    // Always use in-memory as fallback
    fallbackCache.set(key, value, ttlSeconds);

    // Track the key for efficient pattern invalidation
    patternTracker.addKey(key, key);

    // Try Redis (async, don't block on failure)
    const isConnected = await redis.isConnected();
    if (isConnected) {
      const options = ttlSeconds > 0 ? { EX: ttlSeconds } : {};
      await redis.set(key, JSON.stringify(value), options);
      logger.debug(`[Cache] Redis SET: ${key} (${ttlSeconds}s TTL)`);
    } else {
      logger.warn(`[Cache] Redis unavailable, using in-memory for ${key}`);
    }

    return true;
  } catch (error) {
    logger.warn(`[Cache] Set failed for ${key}: ${error.message}`);
    return true;
  }
}

/**
 * Deletes key from cache (Redis + in-memory)
 *
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function deleteCached(key) {
  try {
    // Remove from pattern tracking
    patternTracker.removeKey(key);

    // Delete from both stores
    fallbackCache.delete(key);

    const isConnected = await redis.isConnected();
    if (isConnected) {
      await redis.del(key);
      logger.debug(`[Cache] DELETE: ${key}`);
    }

    return true;
  } catch (error) {
    logger.warn(`[Cache] Delete failed for ${key}: ${error.message}`);
    return false;
  }
}

/**
 * Invalidates cache by pattern efficiently
 *
 * O(k) where k is number of keys matching pattern (not O(n) all keys)
 *
 * @param {string} pattern - Pattern to match (e.g., 'trending:artists:*')
 * @returns {Promise<number>} Number of keys deleted
 */
async function invalidateByPattern(pattern) {
  try {
    let deletedCount = 0;

    // Delete from in-memory using efficient pattern tracking
    const matchingKeys = patternTracker.getKeysMatchingPattern(pattern);
    for (const key of matchingKeys) {
      patternTracker.removeKey(key);
      fallbackCache.delete(key);
      deletedCount++;
    }

    // Delete from Redis
    const isConnected = await redis.isConnected();
    if (isConnected) {
      const redisDeleted = await redis.deleteByPattern(pattern);
      deletedCount = Math.max(deletedCount, redisDeleted);
    }

    logger.debug(`[Cache] Invalidated pattern ${pattern} (${deletedCount} keys)`);
    return deletedCount;
  } catch (error) {
    logger.warn(`[Cache] Invalidation failed for pattern ${pattern}: ${error.message}`);
    return 0;
  }
}

/**
 * Clears all cache
 */
async function clearAll() {
  try {
    patternTracker.clear();
    fallbackCache.clear();

    const isConnected = await redis.isConnected();
    if (isConnected) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('[Cache] Not flushing Redis in production');
      }
    }

    logger.info('[Cache] Cache cleared');
  } catch (error) {
    logger.warn(`[Cache] Clear failed: ${error.message}`);
  }
}

/**
 * Gets cache statistics
 */
async function getStats() {
  try {
    const memStats = fallbackCache.getStats();
    const trackerStats = patternTracker.getStats();
    const isConnected = await redis.isConnected();

    return {
      timestamp: new Date().toISOString(),
      memory: {
        size: memStats.size,
        keys: memStats.keys.length
      },
      patterns: {
        tracked: trackerStats.patterns,
        totalKeys: trackerStats.totalKeys
      },
      redis: {
        connected: isConnected
      }
    };
  } catch (error) {
    logger.warn(`[Cache] Stats retrieval failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Decorator for handlers with Redis caching
 *
 * Usage:
 * export default withRedisCache(handler, {
 *   ttl: 3600,
 *   key: 'artworks',
 *   keyGenerator: (req) => `artworks:${req.query.limit}:${req.query.offset}`
 * });
 */
function withRedisCache(handler, options = {}) {
  const ttl = options.ttl || 3600;
  const keyPrefix = options.key || handler.name || 'cache';
  const keyGenerator = options.keyGenerator;
  const cacheable = options.cacheable || ((req, res, data) => res.statusCode === 200);

  return async (req, res, ...args) => {
    if (req.method !== 'GET') {
      return handler(req, res, ...args);
    }

    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : generateCacheKey(req, keyPrefix);

    try {
      const cached = await getCached(cacheKey);
      if (cached) {
        const age = cached.source === 'redis' ? 0 : (cached.age || 0);
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        res.setHeader('Age', age);
        res.setHeader('X-Cache', cached.source === 'redis' ? 'HIT-REDIS' : 'HIT-MEMORY');
        return res.status(200).json(cached.value);
      }
    } catch (error) {
      logger.warn(`[Cache] Lookup failed for ${cacheKey}: ${error.message}`);
    }

    const originalJson = res.json.bind(res);
    let isResponseSent = false;

    res.json = function(data) {
      if (isResponseSent) {
        return res;
      }
      isResponseSent = true;

      if (cacheable(req, res, data)) {
        setCached(cacheKey, data, ttl).catch(error => {
          logger.warn(`[Cache] Failed to cache ${cacheKey}: ${error.message}`);
        });
      }

      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      res.setHeader('X-Cache', 'MISS');

      return originalJson(data);
    };

    return handler(req, res, ...args);
  };
}

/**
 * Cache invalidation decorator for mutations
 */
function withCacheInvalidation(handler, keysToInvalidate = []) {
  return async (req, res, ...args) => {
    const result = await handler(req, res, ...args);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      for (const pattern of keysToInvalidate) {
        invalidateByPattern(pattern).catch(error => {
          logger.warn(`[Cache] Invalidation failed for ${pattern}: ${error.message}`);
        });
      }
    }

    return result;
  };
}

/**
 * Combined caching decorator
 */
function withCombinedRedisCache(handler, config = {}) {
  let wrapped = handler;

  if (config.cache) {
    wrapped = withRedisCache(wrapped, config.cache);
  }

  if (config.invalidate) {
    wrapped = withCacheInvalidation(wrapped, config.invalidate);
  }

  return wrapped;
}

module.exports = {
  getCached,
  setCached,
  deleteCached,
  invalidateByPattern,
  clearAll,
  getStats,
  withRedisCache,
  withCacheInvalidation,
  withCombinedRedisCache,
  cacheAPI: {
    getCached,
    setCached,
    deleteCached,
    invalidateByPattern,
    clearAll,
    getStats,
  }
};
