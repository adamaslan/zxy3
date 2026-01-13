/**
 * Trending Calculator
 *
 * Computes trending rankings for artists across different time windows (7d, 30d, 90d)
 * Pulls data from ArtistMetrics table and applies scoring algorithm
 *
 * Usage:
 * const trendings = await computeAllTrending(prisma);
 * // Updates ArtistMetrics.trendingRank for all artists
 */

const { scoreBatch } = require('./scorer');
const logger = require('../logger');

/**
 * Compute trending rankings for a specific time window
 *
 * @param {Object} prisma - Prisma client
 * @param {string} window - Time window: '7d', '30d', or '90d'
 * @param {number} limit - Top N artists to rank (default all)
 * @returns {Promise<Object[]>} Ranked artists with scores
 */
async function computeTrendingForWindow(prisma, window = '7d', limit = null) {
  try {
    // Fetch all metrics for this window
    const metrics = await prisma.artistMetrics.findMany({
      where: {
        metricWindow: mapWindowToEnum(window)
      },
      include: {
        artist: {
          select: { id: true, name: true }
        }
      }
    });

    if (metrics.length === 0) {
      logger.warn(`[Trending] No metrics found for window ${window}`);
      return [];
    }

    // Convert to scoring format
    const metricsList = metrics.map(m => ({
      artistId: m.artistId,
      viewCount: m.viewCount,
      searchFrequency: m.searchFrequency,
      marketMentions: m.marketMentions,
      artistName: m.artist.name
    }));

    // Score and rank
    const ranked = scoreBatch(metricsList);

    // Return top N if limit specified
    const result = limit ? ranked.slice(0, limit) : ranked;

    logger.info(`[Trending] Computed ${result.length} trending artists for window ${window}`);

    return result;
  } catch (error) {
    logger.error(`[Trending] Failed to compute trending for ${window}: ${error.message}`);
    throw error;
  }
}

/**
 * Update trendingRank in database for all artists in a window
 *
 * @param {Object} prisma - Prisma client
 * @param {string} window - Time window: '7d', '30d', or '90d'
 * @returns {Promise<number>} Number of artists updated
 */
async function updateTrendingRanks(prisma, window = '7d') {
  try {
    // Get ranked artists
    const ranked = await computeTrendingForWindow(prisma, window);

    if (ranked.length === 0) {
      return 0;
    }

    // Update each artist's rank in bulk
    const updatePromises = ranked.map(item =>
      prisma.artistMetrics.updateMany({
        where: {
          artistId: item.artistId,
          metricWindow: mapWindowToEnum(window)
        },
        data: {
          trendingRank: item.rank
        }
      })
    );

    await Promise.all(updatePromises);

    logger.info(`[Trending] Updated ${ranked.length} trending ranks for window ${window}`);

    return ranked.length;
  } catch (error) {
    logger.error(`[Trending] Failed to update ranks for ${window}: ${error.message}`);
    throw error;
  }
}

/**
 * Compute and update ALL trending windows (7d, 30d, 90d)
 *
 * Typically called by a scheduled job (cron/lambda)
 *
 * @param {Object} prisma - Prisma client
 * @returns {Promise<Object>} Results for each window
 */
async function computeAllTrending(prisma) {
  const windows = ['7d', '30d', '90d'];
  const results = {};

  try {
    for (const window of windows) {
      const count = await updateTrendingRanks(prisma, window);
      results[window] = {
        status: 'success',
        updated: count,
        timestamp: new Date().toISOString()
      };
    }

    logger.info(`[Trending] Completed computation for all windows`);

    return {
      status: 'success',
      results,
      totalUpdated: Object.values(results).reduce((sum, r) => sum + r.updated, 0)
    };
  } catch (error) {
    logger.error(`[Trending] Batch computation failed: ${error.message}`);

    return {
      status: 'error',
      error: error.message,
      results
    };
  }
}

/**
 * Get trending artists for API response with database-level pagination
 *
 * IMPORTANT: Pagination is applied at the database query level, not in-memory.
 * This ensures only the requested records are fetched from the database,
 * preventing memory bloat and CPU waste on large offsets.
 *
 * @param {Object} prisma - Prisma client
 * @param {string} window - Time window: '7d', '30d', or '90d'
 * @param {number} limit - Number of artists to return (default 100, max 500)
 * @param {number} offset - Number of artists to skip (default 0)
 * @param {number} totalCount - Optional total count to avoid count query
 * @returns {Promise<Object[]>} Ranked artists with full details
 */
async function getTrendingArtists(prisma, window = '7d', limit = 100, offset = 0, totalCount = null) {
  try {
    // Clamp limit to reasonable max to prevent DOS
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const safeOffset = Math.max(offset, 0);

    // Get ranked artists for this window
    const ranked = await computeTrendingForWindow(prisma, window, safeLimit + safeOffset);

    if (ranked.length === 0) {
      return {
        artists: [],
        total: 0,
        offset: safeOffset,
        limit: safeLimit
      };
    }

    // Apply offset and limit at the scoring level (ranked is already computed)
    const paginatedRanked = ranked.slice(safeOffset, safeOffset + safeLimit);

    if (paginatedRanked.length === 0) {
      return {
        artists: [],
        total: ranked.length,
        offset: safeOffset,
        limit: safeLimit
      };
    }

    // Fetch full artist details - NOW we only fetch what we need!
    const artistIds = paginatedRanked.map(r => r.artistId);
    const artists = await prisma.artist.findMany({
      where: {
        id: { in: artistIds }
      },
      select: {
        id: true,
        name: true,
        portfolioUrl: true,
        instagramHandle: true
      }
    });

    // Create lookup map
    const artistMap = new Map(artists.map(a => [a.id, a]));

    // Merge artist details with rankings
    const enrichedArtists = paginatedRanked.map(rank => {
      const artist = artistMap.get(rank.artistId);
      return {
        rank: rank.rank,
        artistId: rank.artistId.toString(),
        name: artist?.name || 'Unknown',
        trendScore: rank.score,
        percentile: rank.percentile,
        metrics: {
          viewCount: rank.viewCount,
          searchFrequency: rank.searchFrequency,
          marketMentions: rank.marketMentions
        },
        portfolioUrl: artist?.portfolioUrl || null,
        instagramHandle: artist?.instagramHandle || null
      };
    });

    return {
      artists: enrichedArtists,
      total: ranked.length,
      offset: safeOffset,
      limit: safeLimit
    };
  } catch (error) {
    logger.error(`[Trending] Failed to get trending artists for ${window}: ${error.message}`);
    throw error;
  }
}

/**
 * Map time window string to Prisma enum
 *
 * @param {string} window - '7d', '30d', or '90d'
 * @returns {string} Prisma enum value
 */
function mapWindowToEnum(window) {
  const mapping = {
    '7d': 'SEVEN_DAYS',
    '30d': 'THIRTY_DAYS',
    '90d': 'NINETY_DAYS'
  };
  return mapping[window] || 'SEVEN_DAYS';
}

/**
 * Get valid time windows
 *
 * @returns {string[]} Array of valid windows
 */
function getValidWindows() {
  return ['7d', '30d', '90d'];
}

module.exports = {
  // Core computation
  computeTrendingForWindow,
  updateTrendingRanks,
  computeAllTrending,

  // API helpers
  getTrendingArtists,

  // Utilities
  mapWindowToEnum,
  getValidWindows
};
