/**
 * Artist count display tests
 *
 * Regression: when the backend could not be read, the artists page must
 * say counts are unavailable - never present the failure as a verified
 * empty database ("0 artists in the database").
 */

const { artistCountText, stageCountText, trendingStatusText } = require('../../lib/artistDisplay');

describe('artistCountText', () => {
  it('reports unavailable when the load failed', () => {
    expect(artistCountText(true, 0)).toBe('Artist count unavailable');
  });

  it('does not claim a zero count on failure even when total is 0', () => {
    expect(artistCountText(true, 0)).not.toContain('0 artists');
  });

  it('shows the real count when data loaded', () => {
    expect(artistCountText(false, 42)).toBe('42 artists in the database');
  });

  it('shows a verified zero only when the load succeeded', () => {
    expect(artistCountText(false, 0)).toBe('0 artists in the database');
  });

  it('singularizes a single artist', () => {
    expect(artistCountText(false, 1)).toBe('1 artist in the database');
  });
});

describe('stageCountText', () => {
  it('reports unavailable when the load failed', () => {
    expect(stageCountText(true, 0)).toBe('unavailable');
  });

  it('shows the real count when data loaded', () => {
    expect(stageCountText(false, 7)).toBe('7 artists');
    expect(stageCountText(false, 0)).toBe('0 artists');
  });
});

describe('trendingStatusText - unavailable vs verified empty', () => {
  test('failed trending load renders as unavailable, not as verified no-data', () => {
    expect(trendingStatusText(true)).toBe('Trending data unavailable.');
  });

  test('successful empty load keeps the verified no-data message', () => {
    expect(trendingStatusText(false)).toBe('No trending data yet.');
  });
});
