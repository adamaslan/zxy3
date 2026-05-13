/**
 * In-memory sliding-window rate limiter
 *
 * Usage:
 *   import { withRateLimit } from '../../../lib/middleware/rateLimit';
 *   export default withRateLimit(handler, { windowMs: 60_000, max: 30 });
 *
 * Keyed by IP (x-forwarded-for or req.socket.remoteAddress).
 * Each Next.js serverless instance has its own counter — this is acceptable
 * for abuse deterrence. For hard enforcement across instances, swap the Map
 * for a Redis counter using INCR + EXPIRE.
 */

// Map<"routeKey:ip", { count, windowStart, windowMs }>
// Key includes the route so limits on one endpoint don't consume another's budget
const store = new Map();

// Prune stale entries every 5 minutes to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > entry.windowMs) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * @param {Function} handler
 * @param {{ windowMs?: number, max?: number, routeKey?: string }} options
 *   windowMs  – rolling window length in ms (default 60 000)
 *   max       – max requests per window per IP (default 60)
 *   routeKey  – stable identifier for this route (default 'default')
 *               Must be set per-route so limits don't bleed across endpoints
 */
function withRateLimit(handler, options = {}) {
  const { windowMs = 60_000, max = 60, routeKey } = options;

  if (!routeKey) {
    throw new Error('withRateLimit requires a unique `routeKey` option to prevent rate limit buckets from bleeding across endpoints.');
  }

  return async (req, res) => {
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const storeKey = `${routeKey}:${ip}`;
    const now = Date.now();
    const entry = store.get(storeKey);

    if (!entry || now - entry.windowStart >= windowMs) {
      store.set(storeKey, { count: 1, windowStart: now, windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          status: 'error',
          error: { message: 'Too many requests', code: 'RATE_LIMITED' }
        });
      }
    }

    return handler(req, res);
  };
}

module.exports = { withRateLimit };
