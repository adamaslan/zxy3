/**
 * Trending Calculation Tests
 *
 * Tests for scorer and calculator modules
 */

const scorer = require('../../lib/trending/scorer');
const calculator = require('../../lib/trending/calculator');

describe('Trending Scorer', () => {
  describe('calculateTrendScore', () => {
    it('should calculate weighted trend score', () => {
      const metrics = {
        viewCount: 100,
        searchFrequency: 50,
        marketMentions: 20
      };

      const score = scorer.calculateTrendScore(metrics);

      // (100 * 0.5) + (50 * 0.3) + (20 * 0.2) = 50 + 15 + 4 = 69
      expect(score).toBe(69);
    });

    it('should handle missing metrics as zero', () => {
      const score = scorer.calculateTrendScore({
        viewCount: 100
      });

      // (100 * 0.5) + (0 * 0.3) + (0 * 0.2) = 50
      expect(score).toBe(50);
    });

    it('should return 0 for empty metrics', () => {
      const score = scorer.calculateTrendScore({});
      expect(score).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const metrics = {
        viewCount: 33,
        searchFrequency: 33,
        marketMentions: 33
      };

      const score = scorer.calculateTrendScore(metrics);

      // (33 * 0.5) + (33 * 0.3) + (33 * 0.2) = 16.5 + 9.9 + 6.6 = 33
      expect(Number.isInteger(score) || score % 0.01 === 0).toBe(true);
    });
  });

  describe('normalizeScores', () => {
    it('should normalize scores to 0-100 scale', () => {
      const scores = [10, 20, 30, 40, 50];
      const normalized = scorer.normalizeScores(scores);

      expect(normalized[0]).toBe(20); // 10/50 * 100
      expect(normalized[4]).toBe(100); // 50/50 * 100
    });

    it('should handle all zero scores', () => {
      const scores = [0, 0, 0];
      const normalized = scorer.normalizeScores(scores);

      expect(normalized).toEqual([0, 0, 0]);
    });

    it('should handle empty array', () => {
      expect(scorer.normalizeScores([])).toEqual([]);
    });
  });

  describe('calculatePercentileRank', () => {
    it('should calculate correct percentile', () => {
      const allScores = [10, 20, 30, 40, 50];
      const percentile = scorer.calculatePercentileRank(30, allScores);

      // 2 scores below 30, so (2/5)*100 = 40%
      expect(percentile).toBe(40);
    });

    it('should return 0 for lowest score', () => {
      const allScores = [10, 20, 30];
      const percentile = scorer.calculatePercentileRank(5, allScores);

      expect(percentile).toBe(0);
    });
  });

  describe('scoreBatch', () => {
    it('should rank batch of metrics', () => {
      const metricsList = [
        { artistId: 1n, viewCount: 100, searchFrequency: 50, marketMentions: 20 },
        { artistId: 2n, viewCount: 150, searchFrequency: 75, marketMentions: 30 },
        { artistId: 3n, viewCount: 50, searchFrequency: 25, marketMentions: 10 }
      ];

      const ranked = scorer.scoreBatch(metricsList);

      expect(ranked.length).toBe(3);
      expect(ranked[0].rank).toBe(1); // Highest score first
      expect(ranked[0].artistId).toBe(2n); // artistId 2 has highest score
      expect(ranked[2].rank).toBe(3); // Lowest score last
      expect(ranked[2].artistId).toBe(3n);
    });

    it('should assign percentiles correctly', () => {
      const metricsList = [
        { artistId: 1n, viewCount: 100, searchFrequency: 0, marketMentions: 0 },
        { artistId: 2n, viewCount: 200, searchFrequency: 0, marketMentions: 0 }
      ];

      const ranked = scorer.scoreBatch(metricsList);

      expect(ranked[0].percentile).toBe(50); // Highest: 1 score below / 2 total = 50%
      expect(ranked[1].percentile).toBe(0); // Lowest: 0 scores below / 2 total = 0%
    });

    it('should handle empty list', () => {
      expect(scorer.scoreBatch([])).toEqual([]);
    });
  });

  describe('getTopTrending', () => {
    it('should return top N artists', () => {
      const metricsList = Array.from({ length: 150 }, (_, i) => ({
        artistId: BigInt(i + 1),
        viewCount: 100 - i,
        searchFrequency: 50 - i,
        marketMentions: 20 - i
      }));

      const top = scorer.getTopTrending(metricsList, 10);

      expect(top.length).toBe(10);
      expect(top[0].rank).toBe(1);
      expect(top[9].rank).toBe(10);
    });

    it('should default to 100 if no limit specified', () => {
      const metricsList = Array.from({ length: 50 }, (_, i) => ({
        artistId: BigInt(i + 1),
        viewCount: 100 - i,
        searchFrequency: 50 - i,
        marketMentions: 20 - i
      }));

      const top = scorer.getTopTrending(metricsList);

      expect(top.length).toBe(50); // Only 50 total, less than default 100
    });
  });

  describe('calculateMomentum', () => {
    it('should calculate positive momentum', () => {
      const momentum = scorer.calculateMomentum(50, 75);

      expect(momentum.change).toBe(25);
      expect(momentum.direction).toBe('up');
      expect(momentum.percentChange).toBe(50);
    });

    it('should calculate negative momentum', () => {
      const momentum = scorer.calculateMomentum(100, 75);

      expect(momentum.change).toBe(-25);
      expect(momentum.direction).toBe('down');
    });

    it('should calculate stable momentum', () => {
      const momentum = scorer.calculateMomentum(100, 100);

      expect(momentum.change).toBe(0);
      expect(momentum.direction).toBe('stable');
    });

    it('should handle zero previous score', () => {
      const momentum = scorer.calculateMomentum(0, 50);

      expect(momentum.direction).toBe('up');
      expect(momentum.percentChange).toBe(100);
    });
  });

  describe('WEIGHTS constant', () => {
    it('should have valid weights that sum to 1', () => {
      const { viewCount, searchFrequency, marketMentions } = scorer.WEIGHTS;
      const total = viewCount + searchFrequency + marketMentions;

      expect(total).toBe(1);
    });

    it('should prioritize viewCount', () => {
      expect(scorer.WEIGHTS.viewCount).toBe(0.5);
      expect(scorer.WEIGHTS.viewCount > scorer.WEIGHTS.searchFrequency).toBe(true);
      expect(scorer.WEIGHTS.searchFrequency > scorer.WEIGHTS.marketMentions).toBe(true);
    });
  });
});

describe('Trending Calculator', () => {
  describe('validateMetricWindow', () => {
    it('should return valid window strings as-is', () => {
      expect(calculator.validateMetricWindow('7d')).toBe('7d');
      expect(calculator.validateMetricWindow('30d')).toBe('30d');
      expect(calculator.validateMetricWindow('90d')).toBe('90d');
    });

    it('should default to 7d for unknown window', () => {
      expect(calculator.validateMetricWindow('unknown')).toBe('7d');
    });
  });

  describe('getValidWindows', () => {
    it('should return valid time windows', () => {
      const windows = calculator.getValidWindows();

      expect(windows).toContain('7d');
      expect(windows).toContain('30d');
      expect(windows).toContain('90d');
      expect(windows.length).toBe(3);
    });
  });

  describe('computeTrendingForWindow', () => {
    it('should compute trending from mock data', async () => {
      // Mock Prisma client
      const mockPrisma = {
        artistMetrics: {
          findMany: jest.fn().mockResolvedValue([
            {
              artistId: 1n,
              viewCount: 100,
              searchFrequency: 50,
              marketMentions: 20,
              artist: { id: 1n, name: 'Artist 1' }
            },
            {
              artistId: 2n,
              viewCount: 150,
              searchFrequency: 75,
              marketMentions: 30,
              artist: { id: 2n, name: 'Artist 2' }
            }
          ])
        }
      };

      const ranked = await calculator.computeTrendingForWindow(mockPrisma, '7d');

      expect(ranked.length).toBe(2);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].artistId).toBe(2n); // Higher score
    });

    it('should handle empty metrics', async () => {
      const mockPrisma = {
        artistMetrics: {
          findMany: jest.fn().mockResolvedValue([])
        }
      };

      const ranked = await calculator.computeTrendingForWindow(mockPrisma, '7d');

      expect(ranked).toEqual([]);
    });
  });
});
