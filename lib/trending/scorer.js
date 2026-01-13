/**
 * Trending Score Calculation
 *
 * Calculates trend scores based on weighted metrics:
 * - viewCount: 50% (primary indicator)
 * - searchFrequency: 30% (secondary indicator)
 * - marketMentions: 20% (tertiary indicator)
 *
 * Usage:
 * const score = calculateTrendScore({
 *   viewCount: 150,
 *   searchFrequency: 45,
 *   marketMentions: 12
 * });
 */

/**
 * Weights for each metric in trend scoring
 */
const WEIGHTS = {
  viewCount: 0.5,        // 50% - Views are strongest signal
  searchFrequency: 0.3,  // 30% - Searches indicate interest
  marketMentions: 0.2    // 20% - Market presence
};

/**
 * Calculate raw trend score (0-100 scale)
 *
 * @param {Object} metrics - Metrics object
 *   - viewCount: number
 *   - searchFrequency: number
 *   - marketMentions: number
 * @returns {number} Score 0-100
 */
function calculateTrendScore(metrics = {}) {
  const {
    viewCount = 0,
    searchFrequency = 0,
    marketMentions = 0
  } = metrics;

  // Apply weights (before normalization)
  const weightedScore =
    (viewCount * WEIGHTS.viewCount) +
    (searchFrequency * WEIGHTS.searchFrequency) +
    (marketMentions * WEIGHTS.marketMentions);

  return Math.round(weightedScore * 100) / 100; // Round to 2 decimals
}

/**
 * Normalize scores to 0-100 range based on max value
 *
 * @param {number[]} scores - Array of scores
 * @returns {number[]} Normalized scores 0-100
 */
function normalizeScores(scores) {
  if (scores.length === 0) return [];

  const maxScore = Math.max(...scores);
  if (maxScore === 0) return scores; // All zero, return as-is

  return scores.map(score => Math.round((score / maxScore) * 100 * 100) / 100);
}

/**
 * Calculate percentile rank (0-100)
 *
 * @param {number} score - Score to rank
 * @param {number[]} allScores - All scores to compare against
 * @returns {number} Percentile rank 0-100
 */
function calculatePercentileRank(score, allScores) {
  if (allScores.length === 0) return 0;

  const lowerScores = allScores.filter(s => s < score).length;
  return Math.round((lowerScores / allScores.length) * 10000) / 100; // 2 decimals
}

/**
 * Score batch of artists' metrics
 *
 * @param {Object[]} metricsList - Array of metric objects
 *   Each: { artistId, viewCount, searchFrequency, marketMentions }
 * @returns {Object[]} Array of { artistId, score, rank, percentile }
 */
function scoreBatch(metricsList) {
  if (!metricsList || metricsList.length === 0) {
    return [];
  }

  // Calculate scores for each artist
  const scored = metricsList.map(metrics => ({
    artistId: metrics.artistId,
    score: calculateTrendScore(metrics),
    viewCount: metrics.viewCount || 0,
    searchFrequency: metrics.searchFrequency || 0,
    marketMentions: metrics.marketMentions || 0
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Add rank and percentile
  const allScores = scored.map(s => s.score);
  const ranked = scored.map((item, index) => ({
    ...item,
    rank: index + 1,
    percentile: calculatePercentileRank(item.score, allScores)
  }));

  return ranked;
}

/**
 * Get top N trending artists
 *
 * @param {Object[]} metricsList - Array of metric objects
 * @param {number} limit - Maximum number to return (default 100)
 * @returns {Object[]} Top artists with rankings
 */
function getTopTrending(metricsList, limit = 100) {
  const scored = scoreBatch(metricsList);
  return scored.slice(0, limit);
}

/**
 * Calculate trend momentum (change in score)
 *
 * @param {number} previousScore - Previous trend score
 * @param {number} currentScore - Current trend score
 * @returns {Object} { change, percentChange, direction }
 */
function calculateMomentum(previousScore, currentScore) {
  const change = currentScore - previousScore;
  const percentChange = previousScore === 0
    ? (currentScore > 0 ? 100 : 0)
    : Math.round((change / previousScore) * 10000) / 100;

  return {
    change: Math.round(change * 100) / 100,
    percentChange,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    emoji: change > 0 ? '📈' : change < 0 ? '📉' : '➡️'
  };
}

module.exports = {
  // Constants
  WEIGHTS,

  // Core scoring
  calculateTrendScore,
  normalizeScores,
  calculatePercentileRank,

  // Batch operations
  scoreBatch,
  getTopTrending,

  // Analysis
  calculateMomentum
};
