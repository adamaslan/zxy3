/**
 * Middleware Unit Tests
 *
 * Tests for validation and caching middleware
 */

const { z } = require('zod');
const {
  createRequestValidator,
  formatZodError,
  withValidation
} = require('../../lib/middleware/validation');
const {
  InMemoryCache,
  generateCacheKey,
  invalidateCacheByPrefix,
  cacheAPI
} = require('../../lib/middleware/cache');

describe('Validation Middleware', () => {
  describe('createRequestValidator', () => {
    const testSchema = z.object({
      limit: z.coerce.number().int().min(1).max(100),
      offset: z.coerce.number().int().min(0)
    });

    it('should validate correct query parameters', () => {
      const validator = createRequestValidator(testSchema, 'query');
      const req = {
        query: { limit: 10, offset: 0 }
      };

      const result = validator(req);

      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(0);
    });

    it('should reject invalid query parameters', () => {
      const validator = createRequestValidator(testSchema, 'query');
      const req = {
        query: { limit: 'invalid', offset: -1 }
      };

      const result = validator(req);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle missing required fields', () => {
      const validator = createRequestValidator(testSchema, 'query');
      const req = {
        query: { limit: 10 } // missing offset - should fail or use default
      };

      const result = validator(req);

      // This will fail because offset is required
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should coerce string numbers to integers', () => {
      const validator = createRequestValidator(testSchema, 'query');
      const req = {
        query: { limit: '20', offset: '5' }
      };

      const result = validator(req);

      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(5);
    });
  });

  describe('formatZodError', () => {
    it('should format Zod errors into readable messages', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(0)
      });

      try {
        schema.parse({ name: 'ab', age: -5 });
      } catch (error) {
        const formatted = formatZodError(error);

        expect(formatted.message).toBe('Request validation failed');
        expect(formatted.code).toBe('VALIDATION_ERROR');
        expect(formatted.fields.name).toBeDefined();
        expect(formatted.fields.age).toBeDefined();
      }
    });
  });
});

describe('Cache Middleware', () => {
  describe('InMemoryCache', () => {
    let cache;

    beforeEach(() => {
      cache = new InMemoryCache();
    });

    it('should store and retrieve values', () => {
      cache.set('test-key', { data: 'value' }, 3600);

      const cached = cache.get('test-key');

      expect(cached).not.toBeNull();
      expect(cached.value.data).toBe('value');
    });

    it('should return null for non-existent keys', () => {
      const cached = cache.get('nonexistent');
      expect(cached).toBeNull();
    });

    it('should delete entries', () => {
      cache.set('test-key', { data: 'value' }, 3600);
      expect(cache.has('test-key')).toBe(true);

      cache.delete('test-key');
      expect(cache.has('test-key')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', { data: 1 }, 3600);
      cache.set('key2', { data: 2 }, 3600);
      cache.set('key3', { data: 3 }, 3600);

      expect(cache.getStats().size).toBe(3);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
    });

    it('should handle zero TTL (never expire)', () => {
      cache.set('permanent', { data: 'value' }, 0);

      const cached = cache.get('permanent');
      expect(cached).not.toBeNull();
      expect(cached.value.data).toBe('value');
    });

    it('should track age of cached entries', () => {
      cache.set('test-key', { data: 'value' }, 3600);

      const cached = cache.get('test-key');
      expect(cached.age).toBeGreaterThanOrEqual(0);
      expect(cached.ttl).toBe(3600);
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys for same query', () => {
      const req1 = { path: '/api/artworks', query: { limit: 10, offset: 0 } };
      const req2 = { path: '/api/artworks', query: { limit: 10, offset: 0 } };

      const key1 = generateCacheKey(req1, 'artworks');
      const key2 = generateCacheKey(req2, 'artworks');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different queries', () => {
      const req1 = { path: '/api/artworks', query: { limit: 10 } };
      const req2 = { path: '/api/artworks', query: { limit: 20 } };

      const key1 = generateCacheKey(req1, 'artworks');
      const key2 = generateCacheKey(req2, 'artworks');

      expect(key1).not.toBe(key2);
    });

    it('should use custom key generator if provided', () => {
      const req = { path: '/api/artworks', query: { limit: 10 } };
      const customGenerator = (req) => `custom:${req.query.limit}`;

      const key = generateCacheKey(req, 'artworks', customGenerator);

      expect(key).toBe('custom:10');
    });
  });

  describe('invalidateCacheByPrefix', () => {
    beforeEach(() => {
      cacheAPI.clear();
    });

    it('should invalidate all entries matching prefix', () => {
      cacheAPI.set('artworks:list:abc123', { data: 1 }, 3600);
      cacheAPI.set('artworks:id:def456', { data: 2 }, 3600);
      cacheAPI.set('artists:list:ghi789', { data: 3 }, 3600);

      let stats = cacheAPI.getStats();
      expect(stats.size).toBe(3);

      invalidateCacheByPrefix('artworks');

      stats = cacheAPI.getStats();
      expect(stats.size).toBe(1);
      expect(stats.keys[0]).toContain('artists');
    });
  });

  describe('cacheAPI', () => {
    beforeEach(() => {
      cacheAPI.clear();
    });

    it('should get cache statistics', () => {
      cacheAPI.set('key1', { data: 1 }, 3600);
      cacheAPI.set('key2', { data: 2 }, 3600);

      const stats = cacheAPI.getStats();

      expect(stats.size).toBe(2);
      expect(stats.keys.length).toBe(2);
      expect(stats.timestamp).toBeDefined();
    });

    it('should check if key exists', () => {
      cacheAPI.set('test-key', { data: 'value' }, 3600);

      expect(cacheAPI.has('test-key')).toBe(true);
      expect(cacheAPI.has('nonexistent')).toBe(false);
    });

    it('should get cached values', () => {
      const data = { name: 'Test', value: 123 };
      cacheAPI.set('test-key', data, 3600);

      const cached = cacheAPI.get('test-key');

      expect(cached).not.toBeNull();
      expect(cached.value).toEqual(data);
    });
  });
});

describe('withValidation Decorator', () => {
  it('should validate request and call handler with validated data', async () => {
    const schema = z.object({
      limit: z.coerce.number().int().min(1).max(100)
    });

    const handler = jest.fn((req, res, validated) => {
      res.json({ validated });
    });

    const wrapped = withValidation(schema, 'query', handler);

    const req = {
      method: 'GET',
      url: '/test',
      query: { limit: '10' }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledWith(req, res, { limit: 10 });
  });

  it('should return validation error for invalid request', async () => {
    const schema = z.object({
      limit: z.coerce.number().int().min(1).max(100)
    });

    const handler = jest.fn();

    const wrapped = withValidation(schema, 'query', handler);

    const req = {
      method: 'GET',
      url: '/test',
      query: { limit: 'invalid' }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false
    };

    await wrapped(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      })
    );

    expect(handler).not.toHaveBeenCalled();
  });
});
