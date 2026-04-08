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
        metricWindow: validateMetricWindow(window)
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

    // Convert to scoring format (convert BigInt to number)
    const metricsList = metrics.map(m => ({
      artistId:           typeof m.artistId === 'bigint' ? m.artistId.toString() : m.artistId,
      // Internal metrics (fallback)
      viewCount:          typeof m.viewCount === 'bigint' ? Number(m.viewCount) : (m.viewCount || 0),
      searchFrequency:    typeof m.searchFrequency === 'bigint' ? Number(m.searchFrequency) : (m.searchFrequency || 0),
      marketMentions:     typeof m.marketMentions === 'bigint' ? Number(m.marketMentions) : (m.marketMentions || 0),
      // External metrics (preferred when populated)
      instagramFollowers: m.instagramFollowers ?? null,
      soloShowCount:      m.soloShowCount  || 0,
      groupShowCount:     m.groupShowCount || 0,
      highestSalePrice:   m.highestSalePrice ?? null,
      artsyPageViews:     m.artsyPageViews ?? null,
      artistName:         m.artist.name,
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
          artistId: BigInt(item.artistId),
          metricWindow: validateMetricWindow(window)
        },
        data: {
          trendingRank: BigInt(item.rank)
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

    // Fetch full artist details - only fetch what we need
    const artistIds = paginatedRanked.map(r => BigInt(r.artistId));
    const artists = await prisma.artist.findMany({
      where: {
        id: { in: artistIds }
      },
      select: {
        id: true,
        name: true,
        website: true,
        cv_url: true,
        instagram: true,
        artsy_url: true,
        profile_image_url: true,
        career_stage: true,
      }
    });

    // Create lookup map (convert BigInt to string for consistent key lookup)
    const artistMap = new Map(artists.map(a => [a.id.toString(), a]));

    // Merge artist details with rankings
    const enrichedArtists = paginatedRanked.map(rank => {
      const artist = artistMap.get(rank.artistId);
      return {
        rank:          rank.rank,
        artistId:      rank.artistId.toString(),
        name:          artist?.name || 'Unknown',
        trendScore:    rank.score,
        scoringMode:   rank.scoringMode,
        percentile:    rank.percentile,
        careerStage:   artist?.career_stage || null,
        metrics: {
          // External (preferred)
          instagramFollowers: rank.instagramFollowers,
          soloShowCount:      rank.soloShowCount,
          groupShowCount:     rank.groupShowCount,
          highestSalePrice:   rank.highestSalePrice,
          artsyPageViews:     rank.artsyPageViews,
          // Internal (fallback)
          viewCount:          rank.viewCount,
          searchFrequency:    rank.searchFrequency,
          marketMentions:     rank.marketMentions,
        },
        links: {
          website:      artist?.website || null,
          cvUrl:        artist?.cv_url || null,
          instagram:    artist?.instagram || null,
          artsyUrl:     artist?.artsy_url || null,
          profileImage: artist?.profile_image_url || null,
        },
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
 * Validate and return a metric window string, defaulting to '7d'
 *
 * @param {string} window - '7d', '30d', or '90d'
 * @returns {string} Valid window string
 */
function validateMetricWindow(window) {
  const validWindows = ['7d', '30d', '90d'];
  return validWindows.includes(window) ? window : '7d';
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
  validateMetricWindow,
  getValidWindows
};
