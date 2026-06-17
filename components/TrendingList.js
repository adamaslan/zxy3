/**
 * TrendingList Component
 *
 * Displays a list of trending artists with rankings, scores, and metrics
 */

import Link from 'next/link';
import styles from './TrendingList.module.css';

/**
 * Rank Badge Component
 */
function RankBadge({ rank }) {
  const getBadgeClass = (rank) => {
    if (rank === 1) return styles.rankBadgeGold;
    if (rank === 2) return styles.rankBadgeSilver;
    if (rank === 3) return styles.rankBadgeBronze;
    return styles.rankBadgeDefault;
  };

  return <div className={`${styles.rankBadge} ${getBadgeClass(rank)}`}>#{rank}</div>;
}

/**
 * Score Display Component
 */
function ScoreDisplay({ trendScore, percentile }) {
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className={styles.scoreDisplay}>
      <div className={styles.scoreValue} style={{ color: getScoreColor(trendScore) }}>
        {trendScore.toFixed(1)}
      </div>
      <div className={styles.scoreLabel}>Trend Score</div>
      <div className={styles.percentile}>Top {(100 - percentile).toFixed(0)}%</div>
    </div>
  );
}

/**
 * Metrics Bar Component
 */
function MetricsBar({ viewCount, searchFrequency, marketMentions }) {
  const maxValue = Math.max(viewCount, searchFrequency, marketMentions) || 1;

  const getPercentage = (value) => (value / maxValue) * 100;

  return (
    <div className={styles.metricsBar}>
      <div className={styles.metric}>
        <div className={styles.metricLabel}>Views</div>
        <div className={styles.metricBar}>
          <div
            className={styles.metricFill}
            style={{ width: `${getPercentage(viewCount)}%`, backgroundColor: '#3b82f6' }}
          />
        </div>
        <div className={styles.metricValue}>{viewCount}</div>
      </div>

      <div className={styles.metric}>
        <div className={styles.metricLabel}>Searches</div>
        <div className={styles.metricBar}>
          <div
            className={styles.metricFill}
            style={{ width: `${getPercentage(searchFrequency)}%`, backgroundColor: '#8b5cf6' }}
          />
        </div>
        <div className={styles.metricValue}>{searchFrequency}</div>
      </div>

      <div className={styles.metric}>
        <div className={styles.metricLabel}>Mentions</div>
        <div className={styles.metricBar}>
          <div
            className={styles.metricFill}
            style={{ width: `${getPercentage(marketMentions)}%`, backgroundColor: '#ec4899' }}
          />
        </div>
        <div className={styles.metricValue}>{marketMentions}</div>
      </div>
    </div>
  );
}

/**
 * Artist Card Component
 */
function ArtistCard({ artist }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <RankBadge rank={artist.rank} />
        <ScoreDisplay trendScore={artist.trendScore} percentile={artist.percentile} />
      </div>

      <div className={styles.cardBody}>
        <Link href={`/artists/${artist.artistId}`}>
          <h3 className={styles.artistName}>{artist.name}</h3>
        </Link>

        <MetricsBar
          viewCount={artist.metrics?.viewCount ?? 0}
          searchFrequency={artist.metrics?.searchFrequency ?? 0}
          marketMentions={artist.metrics?.marketMentions ?? 0}
        />

        <div className={styles.links}>
          {artist.portfolioUrl && (
            <a href={artist.portfolioUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
              Portfolio
            </a>
          )}
          {artist.instagramHandle && (
            <a
              href={`https://instagram.com/${artist.instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {artist.instagramHandle}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main TrendingList Component
 */
export default function TrendingList({ artists = [], isLoading = false, error = null }) {
  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load trending artists. Please try again.</p>
        <p className={styles.errorDetails}>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading trending artists...</p>
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No trending artists found for this period.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {artists.map((artist) => (
        <ArtistCard key={artist.artistId} artist={artist} />
      ))}
    </div>
  );
}
