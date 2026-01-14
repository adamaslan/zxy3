/**
 * Trending Artists Page
 *
 * Displays trending artists across different time windows (7d, 30d, 90d)
 * Uses the /api/v2/trending/artists endpoint
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import TrendingList from '../components/TrendingList';
import styles from '../styles/Trending.module.css';

export default function TrendingPage() {
  const [window, setWindow] = useState('7d');
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch trending artists when window changes
  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v2/trending/artists?window=${window}&limit=100`);

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
          setArtists(data.data || []);
        } else {
          throw new Error(data.error?.message || 'Unknown error');
        }
      } catch (err) {
        setError(err.message);
        setArtists([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, [window]);

  const windowLabel = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days'
  };

  const windowDescription = {
    '7d': 'Artists trending right now',
    '30d': 'Artists trending this month',
    '90d': 'Artists trending this quarter'
  };

  return (
    <>
      <Head>
        <title>Trending Artists - ZXY Gallery</title>
        <meta name="description" content="Discover trending artists on ZXY Gallery" />
      </Head>

      <main className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Trending Artists</h1>
          <p className={styles.subtitle}>
            Discover the hottest artists gaining attention in the art world
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            {['7d', '30d', '90d'].map((w) => (
              <button
                key={w}
                className={`${styles.tab} ${window === w ? styles.tabActive : ''}`}
                onClick={() => setWindow(w)}
              >
                {windowLabel[w]}
              </button>
            ))}
          </div>

          <p className={styles.tabDescription}>{windowDescription[window]}</p>
        </div>

        {/* Content */}
        <section className={styles.section}>
          {error && (
            <div className={styles.errorBanner}>
              <p>{error}</p>
            </div>
          )}

          <TrendingList artists={artists} isLoading={isLoading} error={error} />

          {/* Stats */}
          {!isLoading && !error && artists.length > 0 && (
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statValue}>{artists.length}</div>
                <div className={styles.statLabel}>Artists Ranked</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>
                  {artists[0]?.trendScore.toFixed(1) || 'N/A'}
                </div>
                <div className={styles.statLabel}>Top Score</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>
                  {artists.reduce((sum, a) => sum + a.metrics.viewCount, 0).toLocaleString()}
                </div>
                <div className={styles.statLabel}>Total Views</div>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
