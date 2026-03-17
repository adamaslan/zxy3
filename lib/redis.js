/**
 * Redis Client Singleton
 *
 * Provides a single, managed Redis connection with:
 * - Automatic connection pooling
 * - Error handling and reconnection
 * - Health checks
 * - Graceful shutdown
 * - Development fallback to in-memory cache
 *
 * Usage:
 * const redis = require('./lib/redis');
 * await redis.get('key');
 * await redis.set('key', 'value', { EX: 3600 });
 */

const { createClient } = require('redis');
const logger = require('./logger');

/**
 * Redis client singleton
 * Lazy-initialized on first use
 */
let redisClient = null;
let clientPromise = null;
let isConnecting = false;

/**
 * Initialize Redis client
 * Returns a connected client or null if Redis is unavailable
 */
async function initializeRedis() {
  if (redisClient) {
    return redisClient;
  }

  if (clientPromise) {
    return clientPromise;
  }

  if (isConnecting) {
    // Wait for ongoing connection attempt
    return clientPromise;
  }

  isConnecting = true;

  clientPromise = (async () => {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.zxy3a_REDIS_URL;

      if (!redisUrl) {
        logger.warn('[Redis] REDIS_URL not set, skipping Redis connection');
        isConnecting = false;
        return null;
      }

      logger.info(`[Redis] Connecting to ${redisUrl}`);

      const client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            const delay = Math.min(retries * 50, 500);
            logger.warn(`[Redis] Reconnection attempt ${retries}, delay ${delay}ms`);
            return delay;
          },
          connectTimeout: 10000,
          noDelay: true
        }
      });

      // Error handler
      client.on('error', (error) => {
        logger.error(`[Redis] Client error: ${error.message}`);
      });

      client.on('connect', () => {
        logger.info('[Redis] Connected');
      });

      client.on('reconnecting', () => {
        logger.warn('[Redis] Reconnecting...');
      });

      // Connect
      await client.connect();

      redisClient = client;
      isConnecting = false;

      return client;
    } catch (error) {
      logger.error(`[Redis] Failed to connect: ${error.message}`);
      isConnecting = false;
      redisClient = null;
      clientPromise = null;

      // Don't throw - allow graceful degradation
      return null;
    }
  })();

  return clientPromise;
}

/**
 * Get Redis client (lazy initialization)
 * Returns null if Redis is unavailable
 */
async function getClient() {
  if (!redisClient) {
    await initializeRedis();
  }
  return redisClient;
}

/**
 * Check if Redis is connected
 */
async function isConnected() {
  const client = await getClient();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Wrapper for get with error handling
 */
async function get(key) {
  try {
    const client = await getClient();
    if (!client) return null;

    const value = await client.get(key);
    if (value) {
      logger.debug(`[Redis] Cache HIT: ${key}`);
    }
    return value;
  } catch (error) {
    logger.warn(`[Redis] Get failed for ${key}: ${error.message}`);
    return null;
  }
}

/**
 * Wrapper for set with error handling
 * Options: { EX: seconds, PX: milliseconds, NX, XX }
 */
async function set(key, value, options = {}) {
  try {
    const client = await getClient();
    if (!client) return false;

    await client.set(key, value, options);
    logger.debug(`[Redis] Cache SET: ${key}`);
    return true;
  } catch (error) {
    logger.warn(`[Redis] Set failed for ${key}: ${error.message}`);
    return false;
  }
}

/**
 * Wrapper for del with error handling
 */
async function del(key) {
  try {
    const client = await getClient();
    if (!client) return false;

    const deleted = await client.del(key);
    if (deleted > 0) {
      logger.debug(`[Redis] Cache DELETE: ${key}`);
    }
    return deleted > 0;
  } catch (error) {
    logger.warn(`[Redis] Delete failed for ${key}: ${error.message}`);
    return false;
  }
}

/**
 * Wrapper for exists with error handling
 */
async function exists(key) {
  try {
    const client = await getClient();
    if (!client) return false;

    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    logger.warn(`[Redis] Exists check failed for ${key}: ${error.message}`);
    return false;
  }
}

/**
 * Wrapper for expire with error handling
 * Sets TTL on existing key
 */
async function expire(key, seconds) {
  try {
    const client = await getClient();
    if (!client) return false;

    await client.expire(key, seconds);
    logger.debug(`[Redis] Cache EXPIRE: ${key} (${seconds}s)`);
    return true;
  } catch (error) {
    logger.warn(`[Redis] Expire failed for ${key}: ${error.message}`);
    return false;
  }
}

/**
 * Wrapper for invalidate by pattern (SCAN-based)
 * Used for cache invalidation by prefix
 */
async function deleteByPattern(pattern) {
  try {
    const client = await getClient();
    if (!client) return 0;

    let cursor = '0';
    let deleted = 0;

    do {
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });

      cursor = result.cursor;
      const keys = result.keys || [];

      for (const key of keys) {
        await client.del(key);
        deleted++;
      }
    } while (cursor !== '0');

    logger.debug(`[Redis] Cache DELETE pattern: ${pattern} (${deleted} keys)`);
    return deleted;
  } catch (error) {
    logger.warn(`[Redis] Pattern delete failed for ${pattern}: ${error.message}`);
    return 0;
  }
}

/**
 * Health check endpoint
 */
async function healthCheck() {
  try {
    const client = await getClient();
    if (!client) {
      return { status: 'unavailable', message: 'Redis not connected' };
    }

    const pong = await client.ping();
    const info = await client.info('stats');

    return {
      status: 'healthy',
      message: 'Redis is connected and responding',
      connected: true,
      pong,
      stats: info ? parseInfoStats(info) : {}
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      connected: false
    };
  }
}

/**
 * Parse Redis INFO stats response
 */
function parseInfoStats(info) {
  const lines = info.split('\r\n');
  const stats = {};

  lines.forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = isNaN(value) ? value : Number(value);
      }
    }
  });

  return stats;
}

/**
 * Graceful shutdown
 */
async function disconnect() {
  if (redisClient) {
    try {
      logger.info('[Redis] Disconnecting...');
      await redisClient.quit();
      redisClient = null;
      clientPromise = null;
      logger.info('[Redis] Disconnected');
    } catch (error) {
      logger.error(`[Redis] Error during disconnect: ${error.message}`);
    }
  }
}

/**
 * Reset client (for testing)
 */
function reset() {
  redisClient = null;
  clientPromise = null;
  isConnecting = false;
}

module.exports = {
  // Connection management
  getClient,
  isConnected,
  disconnect,
  reset,

  // Core operations
  get,
  set,
  del,
  exists,
  expire,
  deleteByPattern,

  // Health & diagnostics
  healthCheck
};
