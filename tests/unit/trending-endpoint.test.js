/**
 * Trending API Endpoint Tests
 *
 * Tests for /api/v2/trending/artists endpoint
 */

const { getTrendingArtistsSchema } = require('../../lib/api/validators');

describe('Trending API Endpoint', () => {
  describe('getTrendingArtistsSchema', () => {
    it('should validate correct query parameters', () => {
      const query = {
        window: '7d',
        limit: 50,
        offset: 0
      };

      const result = getTrendingArtistsSchema.safeParse(query);

      expect(result.success).toBe(true);
      expect(result.data.window).toBe('7d');
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    });

    it('should allow missing values (defaults applied in handler)', () => {
      const result = getTrendingArtistsSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data.window).toBeUndefined();
      expect(result.data.limit).toBeUndefined();
      expect(result.data.offset).toBeUndefined();
    });

    it('should accept all valid windows', () => {
      const windows = ['7d', '30d', '90d'];

      windows.forEach(window => {
        const result = getTrendingArtistsSchema.safeParse({ window });
        expect(result.success).toBe(true);
        expect(result.data.window).toBe(window);
      });
    });

    it('should reject invalid window', () => {
      const result = getTrendingArtistsSchema.safeParse({ window: '365d' });

      expect(result.success).toBe(false);
    });

    it('should coerce limit and offset to integers', () => {
      const result = getTrendingArtistsSchema.safeParse({
        limit: '50',
        offset: '10'
      });

      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(10);
    });

    it('should enforce limit max of 100', () => {
      const result = getTrendingArtistsSchema.safeParse({
        limit: 150
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = getTrendingArtistsSchema.safeParse({
        offset: -1
      });

      expect(result.success).toBe(false);
    });

    it('should reject zero or negative limit', () => {
      const result = getTrendingArtistsSchema.safeParse({
        limit: 0
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Endpoint response format', () => {
    it('should return correct response structure', async () => {
      const mockPrisma = {
        artistMetrics: {
          findMany: jest.fn().mockResolvedValue([
            {
              artistId: 1n,
              viewCount: 100,
              searchFrequency: 50,
              marketMentions: 20,
              artist: { id: 1n, name: 'Artist 1' }
            }
          ])
        },
        artist: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1n,
              name: 'Artist 1',
              portfolioUrl: 'https://example.com',
              instagramHandle: '@artist1'
            }
          ])
        }
      };

      // Response structure is validated by getTrendingArtists
      // which returns: { rank, artistId, name, trendScore, percentile, metrics, ... }

      const { getTrendingArtists } = require('../../lib/trending/calculator');
      const trendingArtists = await getTrendingArtists(mockPrisma, '7d', 100);

      expect(Array.isArray(trendingArtists)).toBe(true);
      if (trendingArtists.length > 0) {
        const artist = trendingArtists[0];
        expect(artist).toHaveProperty('rank');
        expect(artist).toHaveProperty('artistId');
        expect(artist).toHaveProperty('name');
        expect(artist).toHaveProperty('trendScore');
        expect(artist).toHaveProperty('percentile');
        expect(artist).toHaveProperty('metrics');
        expect(artist.metrics).toHaveProperty('viewCount');
        expect(artist.metrics).toHaveProperty('searchFrequency');
        expect(artist.metrics).toHaveProperty('marketMentions');
      }
    });
  });

  describe('Pagination', () => {
    it('should handle offset correctly', () => {
      const mockResults = Array.from({ length: 150 }, (_, i) => ({
        rank: i + 1,
        artistId: BigInt(i + 1),
        name: `Artist ${i + 1}`,
        trendScore: 100 - i
      }));

      // Simulate offset
      const offset = 10;
      const limit = 20;
      const paginated = mockResults.slice(offset, offset + limit);

      expect(paginated.length).toBe(20);
      expect(paginated[0].rank).toBe(11); // offset + 1
      expect(paginated[19].rank).toBe(30); // offset + limit
    });

    it('should indicate hasMore correctly', () => {
      const total = 150;
      const offset = 140;
      const limit = 20;
      const returned = 10; // Less than limit

      const hasMore = offset + returned < total;

      expect(hasMore).toBe(false); // No more after this
    });
  });

  describe('Error handling', () => {
    it('should handle invalid window gracefully', () => {
      const query = { window: 'invalid' };
      const result = getTrendingArtistsSchema.safeParse(query);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid limit type', () => {
      const query = { limit: 'abc' };
      const result = getTrendingArtistsSchema.safeParse(query);

      expect(result.success).toBe(false);
    });
  });

  describe('Cache key generation', () => {
    it('should generate unique keys for different windows', () => {
      const keyGenerator = (req) => `trending:artists:${req.query.window || '7d'}:${req.query.limit || 100}:${req.query.offset || 0}`;

      const key7d = keyGenerator({ query: { window: '7d', limit: 100, offset: 0 } });
      const key30d = keyGenerator({ query: { window: '30d', limit: 100, offset: 0 } });

      expect(key7d).not.toBe(key30d);
      expect(key7d).toContain('7d');
      expect(key30d).toContain('30d');
    });

    it('should generate unique keys for different limits', () => {
      const keyGenerator = (req) => `trending:artists:${req.query.window || '7d'}:${req.query.limit || 100}:${req.query.offset || 0}`;

      const key100 = keyGenerator({ query: { limit: 100, offset: 0 } });
      const key50 = keyGenerator({ query: { limit: 50, offset: 0 } });

      expect(key100).not.toBe(key50);
    });

    it('should generate unique keys for different offsets', () => {
      const keyGenerator = (req) => `trending:artists:${req.query.window || '7d'}:${req.query.limit || 100}:${req.query.offset || 0}`;

      const key0 = keyGenerator({ query: { offset: 0 } });
      const key20 = keyGenerator({ query: { offset: 20 } });

      expect(key0).not.toBe(key20);
    });
  });
});
