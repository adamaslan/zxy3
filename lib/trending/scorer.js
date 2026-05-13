/**
 * Trending Score Calculation
 *
 * Two scoring modes, selected automatically based on which data is available:
 *
 * EXTERNAL mode (used when external metrics are populated):
 *   - instagramFollowers: 30% — social reach
 *   - totalShows (solo×2 + group): 30% — exhibition history
 *   - highestSalePrice: 25% — market validation
 *   - artsyPageViews: 15% — platform engagement
 *
 * INTERNAL mode (fallback when external data is absent):
 *   - viewCount: 50%
 *   - searchFrequency: 30%
 *   - marketMentions: 20%
 *
 * External mode activates for an artist when at least one external metric
 * (instagramFollowers, highestSalePrice, or artsyPageViews) is non-null.
 */

const EXTERNAL_WEIGHTS = {
  instagramFollowers: 0.30,
  totalShows:         0.30,
  highestSalePrice:   0.25,
  artsyPageViews:     0.15,
};

const INTERNAL_WEIGHTS = {
  viewCount:       0.50,
  searchFrequency: 0.30,
  marketMentions:  0.20,
};

// Scale factors to bring heterogeneous units onto a comparable range
// before applying weights. These are "soft cap" divisors — values above
// the cap still contribute but with diminishing returns via sqrt.
const EXTERNAL_SCALE = {
  instagramFollowers: 100_000,   // 100k followers → 1.0 (before sqrt)
  totalShows:         50,        // 50 shows → 1.0
  highestSalePrice:   500_000,   // $500k → 1.0
  artsyPageViews:     10_000,    // 10k views → 1.0
};

/**
 * Soft-scale a value: sqrt(value / scale), capped at 1.
 * Gives diminishing returns for very large values.
 */
function softScale(value, scale) {
  if (!value || value <= 0 || !scale) return 0;
  return Math.min(Math.sqrt(value / scale), 1);
}

/**
 * Returns true when this metric record has at least one external value.
 */
function hasExternalData(metrics) {
  return (
    metrics.instagramFollowers != null ||
    metrics.highestSalePrice   != null ||
    metrics.artsyPageViews     != null
  );
}

/**
 * Calculate raw trend score using external metrics (0–100 scale).
 */
function calculateExternalScore(metrics) {
  const totalShows =
    ((metrics.soloShowCount || 0) * 2) + (metrics.groupShowCount || 0);

  const scaled = {
    instagramFollowers: softScale(metrics.instagramFollowers, EXTERNAL_SCALE.instagramFollowers),
    totalShows:         softScale(totalShows,                 EXTERNAL_SCALE.totalShows),
    highestSalePrice:   softScale(metrics.highestSalePrice,   EXTERNAL_SCALE.highestSalePrice),
    artsyPageViews:     softScale(metrics.artsyPageViews,     EXTERNAL_SCALE.artsyPageViews),
  };

  const weightedScore =
    (scaled.instagramFollowers * EXTERNAL_WEIGHTS.instagramFollowers) +
    (scaled.totalShows         * EXTERNAL_WEIGHTS.totalShows)         +
    (scaled.highestSalePrice   * EXTERNAL_WEIGHTS.highestSalePrice)   +
    (scaled.artsyPageViews     * EXTERNAL_WEIGHTS.artsyPageViews);

  return Math.round(weightedScore * 100 * 100) / 100; // 0–100, 2 decimals
}

/**
 * Calculate raw trend score using internal metrics (0–∞ before normalization).
 */
function calculateInternalScore(metrics) {
  const { viewCount = 0, searchFrequency = 0, marketMentions = 0 } = metrics;

  const weightedScore =
    (viewCount       * INTERNAL_WEIGHTS.viewCount)       +
    (searchFrequency * INTERNAL_WEIGHTS.searchFrequency) +
    (marketMentions  * INTERNAL_WEIGHTS.marketMentions);

  return Math.round(weightedScore * 100) / 100;
}

/**
 * Calculate trend score, automatically choosing external vs internal mode.
 */
function calculateTrendScore(metrics = {}) {
  if (hasExternalData(metrics)) {
    return calculateExternalScore(metrics);
  }
  return calculateInternalScore(metrics);
}

/**
 * Normalize scores to 0–100 range based on max value.
 */
function normalizeScores(scores) {
  if (scores.length === 0) return [];
  const maxScore = Math.max(...scores);
  if (maxScore === 0) return scores;
  return scores.map(score => Math.round((score / maxScore) * 100 * 100) / 100);
}

/**
 * Calculate percentile rank (0–100).
 */
function calculatePercentileRank(score, allScores) {
  if (allScores.length === 0) return 0;
  const lowerScores = allScores.filter(s => s < score).length;
  return Math.round((lowerScores / allScores.length) * 10000) / 100;
}

/**
 * Score a batch of artists' metrics.
 *
 * Input shape per item:
 *   { artistId, viewCount, searchFrequency, marketMentions,
 *     instagramFollowers, soloShowCount, groupShowCount,
 *     highestSalePrice, artsyPageViews }
 *
 * Returns: [{ artistId, score, rank, percentile, scoringMode, ... }]
 */
function scoreBatch(metricsList) {
  if (!metricsList || metricsList.length === 0) return [];

  const scored = metricsList.map(metrics => ({
    artistId:       metrics.artistId,
    score:          calculateTrendScore(metrics),
    scoringMode:    hasExternalData(metrics) ? 'external' : 'internal',
    viewCount:      metrics.viewCount      || 0,
    searchFrequency:metrics.searchFrequency|| 0,
    marketMentions: metrics.marketMentions || 0,
    instagramFollowers: metrics.instagramFollowers ?? null,
    soloShowCount:  metrics.soloShowCount  || 0,
    groupShowCount: metrics.groupShowCount || 0,
    highestSalePrice:   metrics.highestSalePrice   ?? null,
    artsyPageViews: metrics.artsyPageViews ?? null,
  }));

  scored.sort((a, b) => b.score - a.score);

  const allScores = scored.map(s => s.score);
  return scored.map((item, index) => ({
    ...item,
    rank:       index + 1,
    percentile: calculatePercentileRank(item.score, allScores),
  }));
}

/**
 * Get top N trending artists.
 */
function getTopTrending(metricsList, limit = 100) {
  return scoreBatch(metricsList).slice(0, limit);
}

/**
 * Calculate trend momentum (change in score).
 */
function calculateMomentum(previousScore, currentScore) {
  const change = currentScore - previousScore;
  const percentChange = previousScore === 0
    ? (currentScore > 0 ? 100 : 0)
    : Math.round((change / previousScore) * 10000) / 100;

  return {
    change:        Math.round(change * 100) / 100,
    percentChange,
    direction:     change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
  };
}

module.exports = {
  EXTERNAL_WEIGHTS,
  INTERNAL_WEIGHTS,
  hasExternalData,
  calculateTrendScore,
  calculateExternalScore,
  calculateInternalScore,
  normalizeScores,
  calculatePercentileRank,
  scoreBatch,
  getTopTrending,
  calculateMomentum,
};
