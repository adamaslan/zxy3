/**
 * GET /api/v2/artists
 *
 * Returns paginated list of all artists with optional search
 * Cached for 24 hours (artists rarely change)
 *
 * Query Parameters:
 * - limit: number (1-100, default 20)
 * - offset: number (default 0)
 * - search: string (optional, search by name)
 * - orderBy: 'name' | 'createdAt' (default 'name')
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": [ { artist objects } ],
 *   "meta": {
 *     "timestamp": "2026-01-12T...",
 *     "pagination": { "offset": 0, "limit": 20, "total": 50, "hasMore": true }
 *   }
 * }
 */

import { prisma } from '../../../../prisma/globalprisma';
import { successResponse } from '../../../../lib/api/handlers';
import { getArtistsSchema } from '../../../../lib/api/validators';
import { withRedisCache } from '../../../../lib/middleware/redisCache';

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
    const query = getArtistsSchema.parse(req.query);
    const { limit = 20, offset = 0, search, orderBy = 'name' } = query;

    // Build the where clause
    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        }
      : {};

    // Determine order by field
    const order = {};
    if (orderBy === 'name') {
      order.name = 'asc';
    } else if (orderBy === 'createdAt') {
      order.createdAt = 'desc';
    }

    // Execute queries in parallel
    const [artists, total] = await Promise.all([
      prisma.artist.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        skip: offset,
        take: limit,
        orderBy: order,
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { artworks: true }
          }
        }
      }),
      prisma.artist.count({
        where: Object.keys(where).length > 0 ? where : undefined
      })
    ]);

    // Format response
    const formattedArtists = artists.map(artist => ({
      id: artist.id.toString(),
      name: artist.name,
      artworkCount: artist._count.artworks,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt
    }));

    res.status(200).json(
      successResponse(formattedArtists, {
        pagination: {
          offset,
          limit,
          total,
          hasMore: offset + artists.length < total
        }
      })
    );
  } catch (error) {
    console.error('Error fetching artists:', error);
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';
    res.status(statusCode).json({
      status: 'error',
      error: { message: error.message || 'Internal server error', code }
    });
  }
}

export default withRedisCache(handler, {
  ttl: 86400, // 24 hours (artists rarely change)
  key: 'artists:list',
  keyGenerator: (req) => `artists:list:${req.query.limit}:${req.query.offset}:${req.query.search || 'all'}:${req.query.orderBy || 'name'}`
});
