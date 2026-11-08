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

module.exports = { artistCountText, stageCountText };
