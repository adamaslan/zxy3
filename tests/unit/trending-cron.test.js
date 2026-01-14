/**
 * Trending Cron Job Tests
 *
 * Tests for cron job start/stop, status checks, and manual triggers
 */

// Mock the dependencies before importing the module
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn(),
  })),
}));

jest.mock('../../lib/trending/calculator', () => ({
  computeAllTrending: jest.fn(async () => ({
    sevenDayComputed: 10,
    thirtyDayComputed: 25,
    ninetyDayComputed: 50,
  })),
}));

jest.mock('../../prisma/globalprisma', () => ({
  prisma: {},
}));

jest.mock('../../lib/logger/index', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const {
  startTrendingCron,
  stopTrendingCron,
  isTrendingCronRunning,
  getTrendingCronStatus,
  runTrendingComputationNow,
} = require('../../lib/cron/trendingCron');

describe('Trending Cron Job', () => {
  describe('Cron Status Checks', () => {
    it('should return status structure with required fields', () => {
      const status = getTrendingCronStatus();

      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('schedule');
      expect(typeof status.running).toBe('boolean');
      expect(typeof status.schedule).toBe('string');
    });

    it('should have correct schedule expression', () => {
      const status = getTrendingCronStatus();

      expect(status.schedule).toContain('every hour');
    });

    it('should calculate next run as valid ISO timestamp', () => {
      // Don't start, just check when running
      const status = getTrendingCronStatus();

      if (status.nextRun) {
        expect(status.nextRun).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(() => new Date(status.nextRun)).not.toThrow();
      }
    });

    it('should include properties in status', () => {
      const status = getTrendingCronStatus();

      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('schedule');
      expect(status).toHaveProperty('nextRun');
    });
  });

  describe('Cron Running Flag', () => {
    it('should return running flag as boolean', () => {
      const running = isTrendingCronRunning();

      expect(typeof running).toBe('boolean');
    });

    it('should start in false state', () => {
      const running = isTrendingCronRunning();

      expect(running).toBe(false);
    });
  });

  describe('Start Cron Job', () => {
    it('should return success response object', async () => {
      const result = await startTrendingCron();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should handle start request and return response', async () => {
      const result = await startTrendingCron();

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('success');
    });
  });

  describe('Stop Cron Job', () => {
    it('should return response object with success and message', async () => {
      const result = await stopTrendingCron();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should handle stop request gracefully', async () => {
      const result = await stopTrendingCron();

      // Should return a response object regardless of cron state
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });
  });

  describe('Manual Computation Trigger', () => {
    it('should execute computation and return result', async () => {
      const result = await runTrendingComputationNow();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    it('should return data with computation results', async () => {
      const result = await runTrendingComputationNow();

      if (result.data) {
        expect(result.data).toHaveProperty('sevenDayComputed');
        expect(result.data).toHaveProperty('thirtyDayComputed');
        expect(result.data).toHaveProperty('ninetyDayComputed');
      }
    });

    it('should handle async computation', async () => {
      const result = await runTrendingComputationNow();

      // Ensure it's awaitable and returns an object
      expect(result).toEqual(expect.objectContaining({
        success: expect.any(Boolean),
        message: expect.any(String),
      }));
    });
  });

  describe('Cron Job Response Handling', () => {
    it('should return consistent response structure', async () => {
      const startResult = await startTrendingCron();

      expect(startResult).toMatchObject({
        success: expect.any(Boolean),
        message: expect.any(String),
      });
    });

    it('should return response on manual trigger', async () => {
      const result = await runTrendingComputationNow();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
    });
  });

  describe('Cron Schedule Expression', () => {
    it('should contain hourly schedule indicator', () => {
      const status = getTrendingCronStatus();

      expect(status.schedule).toContain('hour');
    });

    it('should be a non-empty string', () => {
      const status = getTrendingCronStatus();

      expect(status.schedule.length).toBeGreaterThan(0);
    });
  });

  describe('Computation Data Structure', () => {
    it('should return computation data from manual trigger', async () => {
      const result = await runTrendingComputationNow();

      if (result.data) {
        expect(result.data).toHaveProperty('sevenDayComputed');
        expect(result.data).toHaveProperty('thirtyDayComputed');
        expect(result.data).toHaveProperty('ninetyDayComputed');
      }
    });

    it('should have numeric computed values', async () => {
      const result = await runTrendingComputationNow();

      if (result.data) {
        expect(typeof result.data.sevenDayComputed).toBe('number');
        expect(typeof result.data.thirtyDayComputed).toBe('number');
        expect(typeof result.data.ninetyDayComputed).toBe('number');
      }
    });
  });
});
