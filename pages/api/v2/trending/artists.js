/**
 * GET /api/v2/trending/artists
 *
 * Returns trending artists ranked by viewCount, searchFrequency, and marketMentions
 * Cached for 1 hour
 *
 * Query Parameters:
 * - window: '7d' | '30d' | '90d' (default '7d')
 * - limit: number (1-100, default 100)
 * - offset: number (default 0)
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": [
 *     {
 *       "rank": 1,
 *       "artistId": "123",
 *       "name": "Artist Name",
 *       "trendScore": 95.3,
 *       "percentile": 98.5,
 *       "metrics": { "viewCount": 150, "searchFrequency": 45, "marketMentions": 12 },
 *       "portfolioUrl": "https://...",
 *       "instagramHandle": "@..."
 *     }
 *   ],
 *   "meta": {
 *     "timestamp": "2026-01-13T...",
 *     "window": "7d",
 *     "count": 100,
 *     "pagination": { "offset": 0, "limit": 100, "hasMore": false }
 *   }
 * }
 */

import { prisma } from '../../../../prisma/globalprisma';
import { successResponse } from '../../../../lib/api/handlers';
import { getTrendingArtistsSchema } from '../../../../lib/api/validators';
import { getTrendingArtists, getValidWindows } from '../../../../lib/trending/calculator';
import { withRedisCache } from '../../../../lib/middleware/redisCache';
import { withRateLimit } from '../../../../lib/middleware/rateLimit';

async function handler(req, res) {
  try {
    // Only accept GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({
        status: 'error',
        error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }
      });
    }

    // Validate query parameters
    const query = getTrendingArtistsSchema.parse(req.query);
    const { window = '7d', limit = 100, offset = 0 } = query;

    // Validate window is supported
    const validWindows = getValidWindows();
    if (!validWindows.includes(window)) {
      return res.status(400).json({
        status: 'error',
        error: {
          message: `Invalid window. Must be one of: ${validWindows.join(', ')}`,
          code: 'INVALID_WINDOW'
        }
      });
    }

    // Fetch trending artists with database-level pagination
    // This prevents memory bloat and CPU waste on large offsets
    const result = await getTrendingArtists(prisma, window, limit, offset);

    const { artists: trendingArtists, total } = result;

    res.status(200).json(
      successResponse(trendingArtists, {
        window,
        count: trendingArtists.length,
        pagination: {
          offset,
          limit,
          total,
          hasMore: offset + trendingArtists.length < total
        }
      })
    );
  } catch (error) {
    console.error('Error fetching trending artists:', error);

    // Handle validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({
        status: 'error',
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';

    res.status(statusCode).json({
      status: 'error',
      error: { message: error.message || 'Internal server error', code }
    });
  }
}

const VALID_WINDOWS = ['7d', '30d', '90d'];

const cachedHandler = withRedisCache(handler, {
  ttl: 3600, // 1 hour
  key: 'trending:artists',
  keyGenerator: (req) => {
    const window = VALID_WINDOWS.includes(req.query.window) ? req.query.window : '7d';
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = parseInt(req.query.offset, 10) || 0;
    return `trending:artists:${window}:${limit}:${offset}`;
  }
});

export default withRateLimit(cachedHandler, { windowMs: 60_000, max: 20, routeKey: 'trending:artists' });
