/**
 * GET /api/v2/artists/:id
 *
 * Returns a single artist by ID with artwork count and metrics
 * Cached for 24 hours (artists rarely change)
 *
 * Route Parameters:
 * - id: BigInt ID of the artist
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "id": "123",
 *     "name": "Artist Name",
 *     "artworkCount": 5,
 *     "createdAt": "2026-01-11T...",
 *     "updatedAt": "2026-01-12T..."
 *   },
 *   "meta": { "timestamp": "2026-01-12T..." }
 * }
 */

import { prisma } from '../../../../prisma/globalprisma';
import { successResponse } from '../../../../lib/api/handlers';
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

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'ID parameter is required', code: 'MISSING_ID' }
      });
    }

    // Parse ID as BigInt
    let artistId;
    try {
      artistId = BigInt(id);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'Invalid ID format', code: 'INVALID_ID' }
      });
    }

    // Fetch artist with counts
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { artworks: true }
        }
      }
    });

    if (!artist) {
      return res.status(404).json({
        status: 'error',
        error: { message: `Artist with id '${id}' not found`, code: 'NOT_FOUND' }
      });
    }

    // Format response
    const formattedArtist = {
      id: artist.id.toString(),
      name: artist.name,
      artworkCount: artist._count.artworks,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt
    };

    res.status(200).json(successResponse(formattedArtist));
  } catch (error) {
    console.error('Error fetching artist:', error);
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
  key: 'artists:detail',
  keyGenerator: (req) => `artists:detail:${req.query.id}`
});
