/**
 * Display helpers for artist counts.
 *
 * The artists page must not present a failed load as a verified empty
 * database: when the backend could not be read, counts are shown as
 * unavailable instead of "0".
 */

/**
 * @param {boolean} loadFailed true when the artist data source could not be read
 * @param {number} total total artist count (only meaningful when !loadFailed)
 */
function artistCountText(loadFailed, total) {
  if (loadFailed) return 'Artist count unavailable';
  const n = total || 0;
  return `${n} ${n === 1 ? 'artist' : 'artists'} in the database`;
}

/**
 * @param {boolean} loadFailed true when the artist data source could not be read
 * @param {number} count per-stage artist count (only meaningful when !loadFailed)
 */
function stageCountText(loadFailed, count) {
  if (loadFailed) return 'unavailable';
  return `${count || 0} artists`;
}

/**
 * @param {boolean} loadFailed true when the trending data source could not be read
 *
 * A failed trending fetch must not read as a verified "no data yet":
 * an unavailable backend is reported as unavailable, and the verified-empty
 * message (with the backfill hint) is only shown when the load succeeded.
 */
function trendingStatusText(loadFailed) {
  return loadFailed ? 'Trending data unavailable.' : 'No trending data yet.';
}

module.exports = { artistCountText, stageCountText, trendingStatusText };
