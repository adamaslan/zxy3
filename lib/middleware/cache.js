/**
 * Response Caching Middleware
 *
 * Provides caching for API responses with TTL support
 * Decorator pattern for easy integration with handlers
 *
 * Supports:
 * - In-memory caching (development)
 * - Redis caching (production, configured later)
 * - Configurable TTL per endpoint
 * - Cache invalidation
 * - HTTP cache headers (Age, Cache-Control)
 *
 * Usage:
 * const cachedHandler = withCache(handler, { ttl: 3600, key: 'artworks' });
 */

const crypto = require('crypto');

/**
 * In-memory cache store (development)
 * Will be replaced with Redis in Step 3
 */
class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  set(key, value, ttlSeconds) {
    // Clear any existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store value with metadata
    this.store.set(key, {
      value,
      createdAt: Date.now(),
      ttl: ttlSeconds
    });

    // Set timeout for expiration
    if (ttlSeconds > 0) {
      const timer = setTimeout(() => {
        this.store.delete(key);
        this.timers.delete(key);
      }, ttlSeconds * 1000);

      this.timers.set(key, timer);
    }
  }

  get(key) {
    const cached = this.store.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Math.floor((Date.now() - cached.createdAt) / 1000);
    if (cached.ttl > 0 && age > cached.ttl) {
      this.store.delete(key);
      this.timers.delete(key);
      return null;
    }

    // Return value with age
    return {
      value: cached.value,
      age,
      ttl: cached.ttl
    };
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.store.delete(key);
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.store.clear();
  }

  getStats() {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }
}

// Global cache instance
const cache = new InMemoryCache();

/**
 * Generates cache key from request
 *
 * @param {Object} req - Express request object
 * @param {string} prefix - Key prefix (e.g., 'artworks')
 * @param {Function} keyGenerator - Custom key generation function
 * @returns {string} Cache key
 */
function generateCacheKey(req, prefix, keyGenerator) {
  if (keyGenerator) {
    return keyGenerator(req);
  }

  // Default: prefix + query string hash
  const queryString = JSON.stringify(req.query);
  const hash = crypto
    .createHash('md5')
    .update(queryString)
    .digest('hex')
    .substring(0, 8);

  return `${prefix}:${req.path}:${hash}`;
}

/**
 * Cache decorator for API handlers
 *
 * Wraps handler and caches successful responses
 *
 * @param {Function} handler - Original handler function
 * @param {Object} options - Cache options
 *   - ttl: {number} Time to live in seconds (default 3600)
 *   - key: {string} Cache key prefix (default: handler name)
 *   - keyGenerator: {Function} Custom key generation function
 *   - cacheable: {Function} Predicate to determine if response should be cached
 * @returns {Function} Wrapped handler with caching
 */
function withCache(handler, options = {}) {
  const ttl = options.ttl || 3600; // 1 hour default
  const keyPrefix = options.key || handler.name || 'cache';
  const keyGenerator = options.keyGenerator;
  const cacheable = options.cacheable || ((req, res, data) => res.statusCode === 200);

  return async (req, res, ...args) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return handler(req, res, ...args);
    }

    // Generate cache key
    const cacheKey = generateCacheKey(req, keyPrefix, keyGenerator);

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      // Return cached response with Age header
      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      res.setHeader('Age', cached.age);
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.value);
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
        cache.set(cacheKey, data, ttl);
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
 * Cache invalidation decorator
 *
 * Automatically invalidates related caches when handler is called
 *
 * @param {Function} handler - Original handler function
 * @param {string[]} keysToInvalidate - Cache key prefixes to invalidate
 * @returns {Function} Wrapped handler with cache invalidation
 */
function withCacheInvalidation(handler, keysToInvalidate = []) {
  return async (req, res, ...args) => {
    // Call original handler
    const result = await handler(req, res, ...args);

    // Only invalidate on successful mutations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      keysToInvalidate.forEach(prefix => {
        invalidateCacheByPrefix(prefix);
      });
    }

    return result;
  };
}

/**
 * Invalidates all cache entries matching a prefix
 *
 * @param {string} prefix - Cache key prefix to match
 */
function invalidateCacheByPrefix(prefix) {
  const stats = cache.getStats();
  stats.keys.forEach(key => {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  });
}

/**
 * Middleware for adding cache control headers
 *
 * Sets standard HTTP cache headers for responses
 *
 * @param {Object} options - Header options
 *   - maxAge: {number} Max-Age in seconds
 *   - public: {boolean} Whether cache is public (default true)
 *   - revalidate: {boolean} Whether to revalidate (default false)
 */
function withCacheHeaders(options = {}) {
  const maxAge = options.maxAge || 3600;
  const isPublic = options.public !== false;
  const revalidate = options.revalidate || false;

  return (req, res, next) => {
    let cacheControl = isPublic ? 'public' : 'private';
    cacheControl += `, max-age=${maxAge}`;

    if (revalidate) {
      cacheControl += ', must-revalidate';
    }

    res.setHeader('Cache-Control', cacheControl);
    next();
  };
}

/**
 * Combines multiple cache decorators
 *
 * @param {Function} handler - Original handler
 * @param {Object} config - Configuration object
 *   - cache: {Object} Cache options
 *   - invalidate: {string[]} Keys to invalidate
 */
function withCombinedCaching(handler, config = {}) {
  let wrapped = handler;

  if (config.cache) {
    wrapped = withCache(wrapped, config.cache);
  }

  if (config.invalidate) {
    wrapped = withCacheInvalidation(wrapped, config.invalidate);
  }

  return wrapped;
}

/**
 * API for manual cache management
 */
const cacheAPI = {
  /**
   * Get cache statistics
   */
  getStats() {
    const stats = cache.getStats();
    return {
      ...stats,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Clear entire cache
   */
  clear() {
    cache.clear();
  },

  /**
   * Invalidate by prefix
   */
  invalidate(prefix) {
    invalidateCacheByPrefix(prefix);
  },

  /**
   * Get cached value
   */
  get(key) {
    return cache.get(key);
  },

  /**
   * Set cache manually
   */
  set(key, value, ttl = 3600) {
    cache.set(key, value, ttl);
  },

  /**
   * Delete specific key
   */
  delete(key) {
    cache.delete(key);
  },

  /**
   * Check if key exists
   */
  has(key) {
    return cache.has(key);
  }
};

module.exports = {
  InMemoryCache,
  cache,
  withCache,
  withCacheInvalidation,
  withCacheHeaders,
  withCombinedCaching,
  generateCacheKey,
  invalidateCacheByPrefix,
  cacheAPI
};
