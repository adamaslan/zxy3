/**
 * GET /api/v2/artworks
 *
 * Returns paginated list of all artworks with optional filtering
 * Cached for 1 hour
 *
 * Query Parameters:
 * - limit: number (1-100, default 20)
 * - offset: number (default 0)
 * - artistId: number (optional, filter by artist)
 * - search: string (optional, search by medium)
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": [ { artwork objects } ],
 *   "meta": {
 *     "timestamp": "2026-01-12T...",
 *     "pagination": { "offset": 0, "limit": 20, "total": 100, "hasMore": true }
 *   }
 * }
 */

import { prisma } from '../../../../prisma/globalprisma';
import { successResponse } from '../../../../lib/api/handlers';
import { getArtworksSchema } from '../../../../lib/api/validators';
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
    const query = getArtworksSchema.parse(req.query);
    const { limit = 20, offset = 0, artistId, search } = query;

    // Build the where clause
    const where = {};

    if (artistId) {
      where.artistId = BigInt(artistId);
    }

    if (search) {
      where.OR = [
        { medium1: { contains: search, mode: 'insensitive' } },
        { medium2: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Execute queries in parallel
    const [artworks, total] = await Promise.all([
      prisma.artwork.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          artist: {
            select: { id: true, name: true }
          }
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.artwork.count({
        where: Object.keys(where).length > 0 ? where : undefined
      })
    ]);

    // Format response
    const formattedArtworks = artworks.map(artwork => ({
      id: artwork.id.toString(),
      artistId: artwork.artistId.toString(),
      artist: artwork.artist.name,
      medium1: artwork.medium1,
      medium2: artwork.medium2,
      priceRange: artwork.priceRange,
      createdAt: artwork.createdAt,
      updatedAt: artwork.updatedAt
    }));

    res.status(200).json(
      successResponse(formattedArtworks, {
        pagination: {
          offset,
          limit,
          total,
          hasMore: offset + artworks.length < total
        }
      })
    );
  } catch (error) {
    console.error('Error fetching artworks:', error);
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';
    res.status(statusCode).json({
      status: 'error',
      error: { message: error.message || 'Internal server error', code }
    });
  }
}

export default withRedisCache(handler, {
  ttl: 3600, // 1 hour
  key: 'artworks:list',
  keyGenerator: (req) => `artworks:list:${req.query.limit}:${req.query.offset}:${req.query.artistId || 'all'}:${req.query.search || 'all'}`
});
