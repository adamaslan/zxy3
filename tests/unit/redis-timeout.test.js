/**
 * Redis resilience regression tests
 *
 * Production outage: /api/v2/* routes hung indefinitely because
 * client.connect() never settled (Redis endpoint accepted TCP but never
 * answered). Every later request awaited the same never-resolving
 * connection promise. The client must instead time out and degrade to
 * the in-memory cache.
 *
 * These tests mock the `redis` module — no real server needed.
 */

process.env.REDIS_URL = 'redis://unreachable.invalid:6379';
process.env.REDIS_CONNECT_TIMEOUT_MS = '150';
process.env.REDIS_COMMAND_TIMEOUT_MS = '150';

jest.mock('redis', () => ({ createClient: jest.fn() }));

const { createClient } = require('redis');
const redis = require('../../lib/redis');

const NEVER = () => new Promise(() => {});

function fakeClient(overrides = {}) {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue('cached-value'),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    ...overrides,
  };
}

afterEach(() => {
  redis.reset();
  jest.clearAllMocks();
});

describe('Redis resilience timeouts', () => {
  it('returns null when connect() hangs instead of stalling forever', async () => {
    createClient.mockReturnValue(fakeClient({ connect: jest.fn(NEVER) }));

    const start = Date.now();
    const value = await redis.get('k');

    expect(value).toBeNull();
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('retries a fresh connection after a connect timeout', async () => {
    createClient
      .mockReturnValueOnce(fakeClient({ connect: jest.fn(NEVER) }))
      .mockReturnValueOnce(fakeClient());

    await expect(redis.get('k')).resolves.toBeNull();
    await expect(redis.get('k')).resolves.toBe('cached-value');
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it('bounds commands on a connected but unresponsive client', async () => {
    createClient.mockReturnValue(fakeClient({ get: jest.fn(NEVER) }));

    const start = Date.now();
    const value = await redis.get('k');

    expect(value).toBeNull();
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('reports not connected when ping hangs', async () => {
    createClient.mockReturnValue(fakeClient({ ping: jest.fn(NEVER) }));

    await expect(redis.isConnected()).resolves.toBe(false);
  });

  it('still works normally when Redis is healthy', async () => {
    createClient.mockReturnValue(fakeClient());

    await expect(redis.get('k')).resolves.toBe('cached-value');
    await expect(redis.isConnected()).resolves.toBe(true);
    await expect(redis.set('k', 'v')).resolves.toBe(true);
  });
});
