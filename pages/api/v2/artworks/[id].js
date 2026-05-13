/**
 * GET /api/v2/artworks/:id
 *
 * Returns a single artwork by ID with full details including artist information
 * Cached for 1 hour
 *
 * Route Parameters:
 * - id: BigInt ID of the artwork
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": { artwork object },
 *   "meta": { "timestamp": "2026-01-12T..." }
 * }
 */

import { prisma } from '../../../../prisma/globalprisma';
import { successResponse } from '../../../../lib/api/handlers';
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

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'ID parameter is required', code: 'MISSING_ID' }
      });
    }

    // Parse ID as BigInt
    let artworkId;
    try {
      artworkId = BigInt(id);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'Invalid ID format', code: 'INVALID_ID' }
      });
    }

    // Fetch artwork with artist details
    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        artist: {
          select: { id: true, name: true }
        }
      }
    });

    if (!artwork) {
      return res.status(404).json({
        status: 'error',
        error: { message: `Artwork with id '${id}' not found`, code: 'NOT_FOUND' }
      });
    }

    // Format response
    const formattedArtwork = {
      id: artwork.id.toString(),
      artistId: artwork.artistId.toString(),
      artist: artwork.artist.name,
      medium1: artwork.medium1,
      medium2: artwork.medium2,
      priceRange: artwork.priceRange,
      sourceId: artwork.sourceId?.toString() || null,
      createdAt: artwork.createdAt,
      updatedAt: artwork.updatedAt
    };

    res.status(200).json(successResponse(formattedArtwork));
  } catch (error) {
    console.error('Error fetching artwork:', error);
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';
    res.status(statusCode).json({
      status: 'error',
      error: { message: error.message || 'Internal server error', code }
    });
  }
}

const cachedHandler = withRedisCache(handler, {
  ttl: 3600,
  key: 'artworks:detail',
  keyGenerator: (req) => `artworks:detail:${parseInt(req.query.id, 10) || 'invalid'}`
});

export default withRateLimit(cachedHandler, { windowMs: 60_000, max: 60, routeKey: 'artworks-v2-detail' });
