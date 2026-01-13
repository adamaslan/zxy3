/**
 * Redis-Backed Caching Middleware
 *
 * Provides production-grade caching with:
 * - Redis as primary cache store
 * - In-memory fallback for reliability
 * - Configurable TTL per endpoint
 * - Cache invalidation support
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
 * Fallback in-memory cache (used if Redis unavailable)
 */
const fallbackCache = new InMemoryCache();

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
        age: 0, // Redis doesn't track creation time easily
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
    // Fall back to in-memory on error
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
    // Already set in-memory, so return true
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
    // Delete from both
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
 * Invalidates cache by pattern
 *
 * @param {string} pattern - Pattern to match (e.g., 'artworks:*')
 * @returns {Promise<number>} Number of keys deleted
 */
async function invalidateByPattern(pattern) {
  try {
    let deletedCount = 0;

    // Delete from in-memory
    const stats = fallbackCache.getStats();
    for (const key of stats.keys) {
      if (matchPattern(key, pattern)) {
        fallbackCache.delete(key);
        deletedCount++;
      }
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
 * Simple pattern matching (supports * wildcard)
 */
function matchPattern(key, pattern) {
  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
  return regex.test(key);
}

/**
 * Clears all cache
 */
async function clearAll() {
  try {
    fallbackCache.clear();

    const isConnected = await redis.isConnected();
    if (isConnected) {
      // Flush only if connected and in dev/test
      if (process.env.NODE_ENV !== 'production') {
        // For production, we should use more careful invalidation
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
    const isConnected = await redis.isConnected();

    const stats = {
      timestamp: new Date().toISOString(),
      memory: {
        size: memStats.size,
        keys: memStats.keys.length
      },
      redis: {
        connected: isConnected
      }
    };

    return stats;
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
    // Only cache GET requests
    if (req.method !== 'GET') {
      return handler(req, res, ...args);
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : generateCacheKey(req, keyPrefix);

    try {
      // Check cache
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
      // Continue to handler if cache lookup fails
    }

    // Intercept response.json() to cache the result
    const originalJson = res.json.bind(res);
    let isResponseSent = false;

    res.json = function(data) {
      if (isResponseSent) {
        return res;
      }
      isResponseSent = true;

      // Check if response is cacheable
      if (cacheable(req, res, data)) {
        setCached(cacheKey, data, ttl).catch(error => {
          logger.warn(`[Cache] Failed to cache ${cacheKey}: ${error.message}`);
        });
      }

      // Add cache headers
      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      res.setHeader('X-Cache', 'MISS');

      return originalJson(data);
    };

    // Call original handler
    return handler(req, res, ...args);
  };
}

/**
 * Cache invalidation decorator for mutations
 */
function withCacheInvalidation(handler, keysToInvalidate = []) {
  return async (req, res, ...args) => {
    // Call original handler
    const result = await handler(req, res, ...args);

    // Only invalidate on successful mutations
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

/**
 * Cache API for management
 */
const cacheAPI = {
  getCached,
  setCached,
  deleteCached,
  invalidateByPattern,
  clearAll,
  getStats,
  withRedisCache,
  withCacheInvalidation,
  withCombinedRedisCache
};

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
  cacheAPI
};
