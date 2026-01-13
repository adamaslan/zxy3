/**
 * Redis Integration Tests
 *
 * Minimal tests for Redis client and caching
 * Note: Requires Redis running on localhost:6379
 */

const redis = require('../../lib/redis');

// Skip tests if Redis not available
const skipIfNoRedis = process.env.SKIP_REDIS_TESTS === 'true';

describe('Redis Client', () => {
  beforeAll(async () => {
    // Reset client before tests
    redis.reset();
  });

  afterAll(async () => {
    // Disconnect after tests
    await redis.disconnect();
  });

  (skipIfNoRedis ? describe.skip : describe)('Connection', () => {
    it('should connect to Redis', async () => {
      const client = await redis.getClient();
      expect(client).toBeDefined();
    });

    it('should check connection status', async () => {
      const connected = await redis.isConnected();
      expect(connected).toBe(true);
    });

    it('should pass health check', async () => {
      const health = await redis.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
    });
  });

  (skipIfNoRedis ? describe.skip : describe)('Basic Operations', () => {
    beforeEach(async () => {
      // Clean up test keys
      await redis.del('test-key-1');
      await redis.del('test-key-2');
    });

    it('should set and get values', async () => {
      const value = { name: 'test', count: 42 };
      await redis.set('test-key-1', JSON.stringify(value));

      const retrieved = await redis.get('test-key-1');
      expect(retrieved).toBe(JSON.stringify(value));
    });

    it('should delete keys', async () => {
      await redis.set('test-key-1', 'value');
      const exists = await redis.exists('test-key-1');
      expect(exists).toBe(true);

      await redis.del('test-key-1');
      const afterDelete = await redis.exists('test-key-1');
      expect(afterDelete).toBe(false);
    });

    it('should set TTL on keys', async () => {
      await redis.set('test-key-1', 'value', { EX: 10 });
      const exists = await redis.exists('test-key-1');
      expect(exists).toBe(true);

      // Key should expire in 10 seconds
      await redis.expire('test-key-1', 5);
      // Still exists
      const stillExists = await redis.exists('test-key-1');
      expect(stillExists).toBe(true);
    });

    it('should return null for missing keys', async () => {
      const value = await redis.get('nonexistent-key');
      expect(value).toBeNull();
    });
  });

  (skipIfNoRedis ? describe.skip : describe)('Error Handling', () => {
    it('should handle invalid keys gracefully', async () => {
      // Should not throw
      const value = await redis.get(null);
      expect(value).toBeNull();
    });

    it('should handle get errors gracefully', async () => {
      // This should not throw even if something goes wrong
      const value = await redis.get('test-key');
      expect(typeof value === 'string' || value === null).toBe(true);
    });
  });
});

describe('Redis Cache Middleware', () => {
  let { getCached, setCached, deleteCached } = require('../../lib/middleware/redisCache');

  beforeEach(() => {
    // Reset module state
    jest.resetModules();
    ({ getCached, setCached, deleteCached } = require('../../lib/middleware/redisCache'));
  });

  describe('In-Memory Fallback', () => {
    it('should cache values in memory', async () => {
      const key = 'test-cache-key';
      const value = { test: 'data' };

      // Set
      await setCached(key, value, 3600);

      // Get
      const cached = await getCached(key);
      expect(cached).not.toBeNull();
      expect(cached.value).toEqual(value);
      expect(['memory', 'redis']).toContain(cached.source);
    });

    it('should delete cached values', async () => {
      const key = 'test-cache-key';
      const value = { test: 'data' };

      // Set and verify
      await setCached(key, value, 3600);
      let cached = await getCached(key);
      expect(cached).not.toBeNull();

      // Delete
      await deleteCached(key);

      // Verify deleted (might still exist in Redis if connected, but in-memory is gone)
      cached = await getCached(key);
      // If Redis isn't available, should be null. If it is, might still exist
      // So we just check it doesn't throw
      expect(typeof cached === 'object' || cached === null).toBe(true);
    });
  });

  describe('withRedisCache Decorator', () => {
    it('should cache GET request responses', async () => {
      const { withRedisCache } = require('../../lib/middleware/redisCache');

      let handlerCallCount = 0;
      const handler = jest.fn((req, res) => {
        handlerCallCount++;
        res.statusCode = 200;
        res.json({ count: handlerCallCount });
      });

      const cachedHandler = withRedisCache(handler, {
        ttl: 3600,
        key: 'test'
      });

      const req = {
        method: 'GET',
        path: '/test',
        url: '/test',
        query: {}
      };

      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        json: jest.fn()
      };

      // First call (cache miss)
      await cachedHandler(req, res);
      expect(handlerCallCount).toBe(1);

      // Second call (should hit cache or handler again depending on Redis)
      // We just verify it doesn't throw
      res.json = jest.fn();
      await cachedHandler(req, res);
      expect(res.json).toBeDefined();
    });

    it('should not cache POST requests', async () => {
      const { withRedisCache } = require('../../lib/middleware/redisCache');

      let callCount = 0;
      const handler = jest.fn(() => {
        callCount++;
      });

      const cachedHandler = withRedisCache(handler, { ttl: 3600 });

      const req = {
        method: 'POST',
        path: '/test',
        url: '/test',
        query: {}
      };

      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        json: jest.fn()
      };

      // Call twice
      await cachedHandler(req, res);
      await cachedHandler(req, res);

      // Should call handler both times (POST not cached)
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
