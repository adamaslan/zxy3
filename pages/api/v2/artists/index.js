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
    const { limit = 20, offset = 0, search, orderBy = 'name', careerStage } = query;

    // Build the where clause
    const where = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (careerStage) {
      where.comprehend_tags = { has: careerStage };
    }

    // Determine order by field
    const order = {};
    if (orderBy === 'name') {
      order.name = 'asc';
    } else if (orderBy === 'createdAt') {
      order.createdAt = 'desc';
    }

    const CAREER_STAGES = ['emerging artist', 'mid-career artist', 'established artist', 'late-career artist'];
    const whereClause = Object.keys(where).length > 0 ? where : undefined;

    // Execute queries in parallel, including per-stage counts for the sidebar
    const [artists, total, ...stageCountResults] = await Promise.all([
      prisma.artist.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: order,
        select: {
          id: true,
          name: true,
          bio: true,
          comprehend_tags: true,
          createdAt: true,
          updatedAt: true,
          gallery_links: {
            take: 1,
            select: {
              gallery: { select: { name: true, city: true } }
            }
          },
          _count: {
            select: { artworks: true }
          }
        }
      }),
      prisma.artist.count({ where: whereClause }),
      ...CAREER_STAGES.map(stage =>
        prisma.artist.count({
          where: { ...where, comprehend_tags: { has: stage } }
        })
      )
    ]);

    const stageCounts = Object.fromEntries(
      CAREER_STAGES.map((stage, i) => [stage, stageCountResults[i]])
    );

    // Format response
    const formattedArtists = artists.map(artist => ({
      id: artist.id.toString(),
      name: artist.name,
      bio: artist.bio || null,
      comprehend_tags: artist.comprehend_tags || [],
      gallery: artist.gallery_links?.[0]?.gallery || null,
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
        },
        stageCounts
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

function sanitizeCacheSegment(value) {
  if (!value) return '';
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

export default withRedisCache(handler, {
  ttl: 86400, // 24 hours (artists rarely change)
  key: 'artists:list',
  keyGenerator: (req) => {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const search = sanitizeCacheSegment(req.query.search) || 'all';
    const orderBy = req.query.orderBy === 'createdAt' ? 'createdAt' : 'name';
    const careerStage = sanitizeCacheSegment(req.query.careerStage) || 'all';
    return `artists:list:${limit}:${offset}:${search}:${orderBy}:${careerStage}`;
  }
});
