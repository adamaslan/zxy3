import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/B2BMomentum.module.css';

const WINDOWS = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
];

const STAGES = ['all', 'Emerging', 'Mid-career', 'Established', 'Researching'];
const INITIAL_VISIBLE_ARTISTS = 120;
const VISIBLE_ARTIST_INCREMENT = 120;
const RANK_LIMIT_PER_WINDOW = 250;

const SIGNAL_FILTERS = [
  { id: 'hasCv', label: 'CV' },
  { id: 'hasInstagram', label: 'Instagram' },
  { id: 'hasWebsite', label: 'Website' },
  { id: 'recentOpening', label: 'Event' },
  { id: 'topGallery', label: 'Top gallery' },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [header, ...body] = rows;
  return body.map(values => {
    const record = {};
    header.forEach((key, index) => {
      record[key] = values[index] || '';
    });
    return record;
  });
}

function titleCase(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeGalleryName(value) {
  return value
    .replace(/-(NewYork|New York|NY|LA|LosAngeles|Los Angeles|Brussels|Miami|London|Paris|HongKong|Hong Kong|Philadelphia|Chicago|Greenville)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseGalleryList(value) {
  if (!value) return [];

  const names = value
    .split(/[,;]+/)
    .map(item => normalizeGalleryName(item))
    .filter(Boolean)
    .map(item => {
      if (item === item.toUpperCase()) return titleCase(item);
      return item;
    });

  return Array.from(new Set(names));
}

function extractInstagram(value) {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.includes('instagram.com')) {
    const match = trimmed.match(/instagram\.com\/([A-Za-z0-9._-]+)/);
    return match?.[1] || '';
  }

  return trimmed.replace(/^@/, '').replace(/\/$/, '');
}

function parseFollowers(value) {
  if (!value) return 0;
  const clean = String(value).replace(/,/g, '').trim().toLowerCase();
  if (!clean) return 0;

  if (clean.endsWith('k')) return Math.round(Number(clean.slice(0, -1)) * 1000) || 0;
  if (clean.endsWith('m')) return Math.round(Number(clean.slice(0, -1)) * 1000000) || 0;
  return Number(clean) || 0;
}

function softScale(value, cap) {
  if (!value || value <= 0) return 0;
  return Math.min(Math.sqrt(value / cap), 1) * 100;
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeExternalUrl(value, baseUrl = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  if (baseUrl) {
    const normalizedBase = normalizeExternalUrl(baseUrl);
    try {
      return new URL(trimmed, normalizedBase).toString();
    } catch {
      // Fall through to protocol prefix.
    }
  }

  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function computeScores(signals) {
  const galleryScore = Math.min(signals.galleryCount / 5, 1) * 100;
  const sourceScore =
    (signals.hasCv ? 40 : 0) +
    (signals.hasWebsite ? 30 : 0) +
    (signals.hasInstagram ? 30 : 0);
  const socialScore = signals.instagramFollowers
    ? softScale(signals.instagramFollowers, 100000)
    : (signals.hasInstagram ? 42 : 0);
  const eventScore = signals.recentOpening ? 100 : 0;
  const qualityScore = Math.min((signals.topGalleryCount * 55) + (signals.galleryCount * 7), 100);

  const weights = {
    '7d': { gallery: 0.24, source: 0.18, social: 0.12, event: 0.34, quality: 0.12 },
    '30d': { gallery: 0.32, source: 0.22, social: 0.12, event: 0.18, quality: 0.16 },
    '90d': { gallery: 0.42, source: 0.20, social: 0.10, event: 0.08, quality: 0.20 },
  };

  return Object.fromEntries(
    Object.entries(weights).map(([window, w]) => {
      const raw =
        galleryScore * w.gallery +
        sourceScore * w.source +
        socialScore * w.social +
        eventScore * w.event +
        qualityScore * w.quality;
      const confidenceAdjusted = raw * (0.84 + signals.confidence * 0.16);
      return [window, Math.round(confidenceAdjusted * 10) / 10];
    })
  );
}

function deriveStage({ galleryCount, topGalleryCount, hasCv, hasWebsite }) {
  if (topGalleryCount >= 1 && galleryCount >= 3) return 'Established';
  if (galleryCount >= 3) return 'Mid-career';
  if (galleryCount >= 1 || hasCv || hasWebsite) return 'Emerging';
  return 'Researching';
}

function formatNumber(value) {
  if (!value) return '0';
  return Number(value).toLocaleString();
}

function galleryNameFromSlug(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getRankedArtistUnion(artists, windows, limit) {
  const artistMap = new Map();

  windows.forEach(window => {
    [...artists]
      .sort((a, b) => b.scores[window] - a.scores[window])
      .slice(0, limit)
      .forEach(artist => {
        artistMap.set(artist.id, artist);
      });
  });

  return Array.from(artistMap.values())
    .sort((a, b) => b.scores['30d'] - a.scores['30d']);
}

function exportRows(rows, window) {
  const columns = [
    'rank',
    'name',
    'stage',
    'momentum_score',
    'gallery_count',
    'top_gallery_count',
    'website',
    'instagram',
    'cv_url',
  ];

  const lines = [
    columns.join(','),
    ...rows.map((artist, index) => [
      index + 1,
      artist.name,
      artist.stage,
      artist.scores[window],
      artist.galleryCount,
      artist.topGalleryCount,
      artist.website,
      artist.instagram ? `https://instagram.com/${artist.instagram}` : '',
      artist.cvUrl,
    ].map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `artist-momentum-${window}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function SignalMeter({ label, value }) {
  return (
    <div className={styles.signalMeter}>
      <div className={styles.signalMeterLabel}>
        <span>{label}</span>
        <strong>{Math.round(value)}</strong>
      </div>
      <div className={styles.meterTrack}>
        <div className={styles.meterFill} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function ArtistInitials({ name }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  return <div className={styles.initials}>{initials || 'AR'}</div>;
}

function EvidencePill({ children, active = true }) {
  return (
    <span className={active ? styles.evidencePill : styles.evidencePillMuted}>
      {children}
    </span>
  );
}

function ArtistRow({ artist, rank, window, selected, onSelect, onToggleWatch, watched }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.artistRow} ${selected ? styles.artistRowSelected : ''}`}
      onClick={() => onSelect(artist.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(artist.id);
        }
      }}
    >
      <span className={styles.rank}>{rank}</span>
      <ArtistInitials name={artist.name} />
      <span className={styles.artistMain}>
        <span className={styles.artistName}>{artist.name}</span>
        <span className={styles.artistMeta}>
          {artist.stage} - {artist.galleryCount} galleries - confidence {artist.confidenceLabel}
        </span>
      </span>
      <span className={styles.rowSignals}>
        {artist.hasCv && <EvidencePill>CV</EvidencePill>}
        {artist.hasInstagram && <EvidencePill>IG</EvidencePill>}
        {artist.recentOpening && <EvidencePill>Event</EvidencePill>}
        {artist.topGalleryCount > 0 && <EvidencePill>Top gallery</EvidencePill>}
      </span>
      <span className={styles.scoreCell}>{artist.scores[window].toFixed(1)}</span>
      <button
        type="button"
        className={`${styles.watchButton} ${watched ? styles.watchButtonActive : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleWatch(artist.id);
        }}
      >
        {watched ? 'Watching' : 'Watch'}
      </button>
    </div>
  );
}

function DetailPanel({ artist, window }) {
  if (!artist) {
    return (
      <aside className={styles.detailPanel}>
        <p className={styles.emptyDetail}>Select an artist to inspect the signal stack.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <ArtistInitials name={artist.name} />
        <div>
          <h2>{artist.name}</h2>
          <p>{artist.stage} - rank signal view</p>
        </div>
      </div>

      <div className={styles.detailScore}>
        <span>{artist.scores[window].toFixed(1)}</span>
        <p>{window.toUpperCase()} momentum score</p>
      </div>

      <div className={styles.signalStack}>
        <SignalMeter label="Gallery graph" value={artist.signalBreakdown.gallery} />
        <SignalMeter label="Source depth" value={artist.signalBreakdown.source} />
        <SignalMeter label="Social reach" value={artist.signalBreakdown.social} />
        <SignalMeter label="Recent event" value={artist.signalBreakdown.event} />
        <SignalMeter label="Gallery quality" value={artist.signalBreakdown.quality} />
      </div>

      <div className={styles.detailSection}>
        <h3>Gallery associations</h3>
        <div className={styles.galleryList}>
          {artist.galleries.slice(0, 8).map(gallery => (
            <span key={gallery}>{gallery}</span>
          ))}
          {artist.galleries.length === 0 && <span>No gallery data yet</span>}
        </div>
      </div>

      <div className={styles.detailSection}>
        <h3>Evidence</h3>
        <div className={styles.evidenceGrid}>
          <EvidencePill active={artist.hasWebsite}>Website</EvidencePill>
          <EvidencePill active={artist.hasInstagram}>Instagram</EvidencePill>
          <EvidencePill active={artist.hasCv}>CV</EvidencePill>
          <EvidencePill active={artist.recentOpening}>Recent event</EvidencePill>
          <EvidencePill active={artist.topGalleryCount > 0}>Top gallery</EvidencePill>
        </div>
      </div>

      <div className={styles.linkStack}>
        {artist.website && <a href={artist.website} target="_blank" rel="noopener noreferrer">Website</a>}
        {artist.instagram && (
          <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        )}
        {artist.cvUrl && <a href={artist.cvUrl} target="_blank" rel="noopener noreferrer">CV</a>}
      </div>
    </aside>
  );
}

export default function MomentumRadarPage({ initialArtists, generatedAt, sourceStats }) {
  const [window, setWindow] = useState('7d');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [signalFilters, setSignalFilters] = useState([]);
  const [selectedId, setSelectedId] = useState(initialArtists[0]?.id || '');
  const [watchedIds, setWatchedIds] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ARTISTS);

  const filteredArtists = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return initialArtists
      .filter(artist => {
        if (stage !== 'all' && artist.stage !== stage) return false;
        if (searchTerm) {
          const haystack = `${artist.name} ${artist.galleries.join(' ')}`.toLowerCase();
          if (!haystack.includes(searchTerm)) return false;
        }

        return signalFilters.every(filter => {
          if (filter === 'hasCv') return artist.hasCv;
          if (filter === 'hasInstagram') return artist.hasInstagram;
          if (filter === 'hasWebsite') return artist.hasWebsite;
          if (filter === 'recentOpening') return artist.recentOpening;
          if (filter === 'topGallery') return artist.topGalleryCount > 0;
          return true;
        });
      })
      .sort((a, b) => b.scores[window] - a.scores[window]);
  }, [initialArtists, search, signalFilters, stage, window]);

  const selectedArtist = filteredArtists.find(artist => artist.id === selectedId) || filteredArtists[0] || null;
  const visibleArtists = useMemo(
    () => filteredArtists.slice(0, visibleCount),
    [filteredArtists, visibleCount]
  );

  const stats = useMemo(() => {
    const top = filteredArtists[0];
    const withCv = filteredArtists.filter(artist => artist.hasCv).length;
    const withInstagram = filteredArtists.filter(artist => artist.hasInstagram).length;
    const topGallery = filteredArtists.filter(artist => artist.topGalleryCount > 0).length;

    return {
      ranked: filteredArtists.length,
      topScore: top ? top.scores[window].toFixed(1) : '0.0',
      cvCoverage: filteredArtists.length ? Math.round((withCv / filteredArtists.length) * 100) : 0,
      instagramCoverage: filteredArtists.length ? Math.round((withInstagram / filteredArtists.length) * 100) : 0,
      topGallery,
    };
  }, [filteredArtists, window]);

  function toggleSignalFilter(filter) {
    setSignalFilters(current => (
      current.includes(filter)
        ? current.filter(item => item !== filter)
        : [...current, filter]
    ));
  }

  function toggleWatch(id) {
    setWatchedIds(current => (
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    ));
  }

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_ARTISTS);
  }, [search, signalFilters, stage, window]);

  return (
    <>
      <Head>
        <title>Artist Momentum Radar - ZXY B2B</title>
        <meta name="description" content="Ranked artist momentum dashboard for ZXY B2B." />
      </Head>

      <main className={styles.page}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}>ZXY B2B</Link>
          <nav className={styles.nav}>
            <Link href="/b2b/momentum">Momentum</Link>
            <Link href="/trending">Trending</Link>
            <Link href="/posts/artists">Artists</Link>
          </nav>
        </header>

        <section className={styles.workspaceHeader}>
          <div>
            <p className={styles.kicker}>Emerging Artist Momentum Radar</p>
            <h1>Artist momentum</h1>
            <p className={styles.headerMeta}>
              {sourceStats.artistCount} ranked artists - {sourceStats.totalArtistCount} source records - {sourceStats.galleryCount} galleries - generated {generatedAt}
            </p>
          </div>

          <div className={styles.windowControl} aria-label="Momentum window">
            {WINDOWS.map(item => (
              <button
                type="button"
                key={item.id}
                className={window === item.id ? styles.windowActive : ''}
                onClick={() => setWindow(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.statGrid} aria-label="Momentum summary">
          <div className={styles.statTile}>
            <span>{stats.ranked}</span>
            <p>ranked artists</p>
          </div>
          <div className={styles.statTile}>
            <span>{stats.topScore}</span>
            <p>top score</p>
          </div>
          <div className={styles.statTile}>
            <span>{stats.cvCoverage}%</span>
            <p>CV coverage</p>
          </div>
          <div className={styles.statTile}>
            <span>{stats.instagramCoverage}%</span>
            <p>Instagram coverage</p>
          </div>
          <div className={styles.statTile}>
            <span>{stats.topGallery}</span>
            <p>top gallery links</p>
          </div>
        </section>

        <section className={styles.controls}>
          <div className={styles.searchWrap}>
            <label htmlFor="artist-search">Search</label>
            <input
              id="artist-search"
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Artist or gallery"
            />
          </div>

          <div className={styles.selectWrap}>
            <label htmlFor="stage-filter">Stage</label>
            <select id="stage-filter" value={stage} onChange={event => setStage(event.target.value)}>
              {STAGES.map(item => (
                <option key={item} value={item}>
                  {item === 'all' ? 'All stages' : item}
                </option>
              ))}
            </select>
          </div>

          <fieldset className={styles.signalFilters}>
            <legend>Signals</legend>
            {SIGNAL_FILTERS.map(filter => (
              <label key={filter.id}>
                <input
                  type="checkbox"
                  checked={signalFilters.includes(filter.id)}
                  onChange={() => toggleSignalFilter(filter.id)}
                />
                <span>{filter.label}</span>
              </label>
            ))}
          </fieldset>

          <button
            type="button"
            className={styles.exportButton}
            onClick={() => exportRows(filteredArtists, window)}
          >
            Export CSV
          </button>
        </section>

        <section className={styles.dashboard}>
          <div className={styles.tablePanel}>
            <div className={styles.tableHeader}>
              <span>Rank</span>
              <span>Artist</span>
              <span>Signals</span>
              <span>Score</span>
              <span>Watchlist</span>
            </div>

            <div className={styles.artistList}>
              {visibleArtists.map((artist, index) => (
                <ArtistRow
                  key={artist.id}
                  artist={artist}
                  rank={index + 1}
                  window={window}
                  selected={selectedArtist?.id === artist.id}
                  onSelect={setSelectedId}
                  onToggleWatch={toggleWatch}
                  watched={watchedIds.includes(artist.id)}
                />
              ))}

              {filteredArtists.length === 0 && (
                <div className={styles.noResults}>No artists match the current filters.</div>
              )}

              {filteredArtists.length > visibleArtists.length && (
                <div className={styles.showMoreWrap}>
                  <p>
                    Showing {visibleArtists.length} of {filteredArtists.length} matching artists.
                  </p>
                  <button
                    type="button"
                    className={styles.showMoreButton}
                    onClick={() => setVisibleCount(count => count + VISIBLE_ARTIST_INCREMENT)}
                  >
                    Show more
                  </button>
                </div>
              )}
            </div>
          </div>

          <DetailPanel artist={selectedArtist} window={window} />
        </section>
      </main>
    </>
  );
}

export async function getStaticProps() {
  const fs = await import('fs/promises');
  const path = await import('path');

  const root = process.cwd();
  const dataDir = path.join(root, 'data');

  async function readOptional(relativePath) {
    try {
      return await fs.readFile(path.join(root, relativePath), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return '';
      throw error;
    }
  }

  const [artistCsv, galleryCsv, openingsMd, seedGalleriesJson, topGallerySignalsJson] = await Promise.all([
    readOptional('data/artists-consolidated.csv'),
    readOptional('data/galleries-consolidated.csv'),
    readOptional('data/upcoming-openings.md'),
    readOptional('data/seed-galleries.json'),
    readOptional('data/top-gallery-signals.json'),
  ]);

  const seedGalleries = seedGalleriesJson ? JSON.parse(seedGalleriesJson) : [];
  const galleryRows = galleryCsv
    ? parseCsv(galleryCsv)
    : seedGalleries.map(gallery => ({
      name: gallery.name,
      slug: gallery.slug,
      website: gallery.website,
      status: 'active',
      type: gallery.tier || gallery.segment || 'gallery',
    }));

  async function loadExtractedArtistRows() {
    const files = await fs.readdir(dataDir).catch(() => []);
    const extractedFiles = files.filter(file => /^extracted-.*\.json$/.test(file));
    const artistMap = new Map();
    const payloads = await Promise.all(
      extractedFiles.map(async file => ({
        file,
        payload: JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf8')),
      }))
    );

    for (const { file, payload } of payloads) {
      const fallbackGallery = galleryNameFromSlug(payload.gallery || file.replace(/^extracted-/, '').replace(/\.json$/, ''));

      for (const artist of payload.artists || []) {
        if (!artist.name) continue;

        const key = artist.name.trim().toLowerCase();
        const existing = artistMap.get(key) || {
          name: artist.name.trim(),
          website: '',
          instagram: '',
          instagram_followers: '',
          cv_url: '',
          galleries_exhibited: '',
          _recentOpening: false,
        };

        const galleries = new Set(parseGalleryList(existing.galleries_exhibited));
        const representedBy = artist.represented_by?.length ? artist.represented_by : [fallbackGallery];
        representedBy.forEach(gallery => {
          if (gallery) galleries.add(gallery);
        });

        existing.website = existing.website || artist.website || '';
        existing.instagram = existing.instagram || artist.instagram || '';
        existing.galleries_exhibited = Array.from(galleries).join(', ');
        existing._recentOpening = existing._recentOpening || (artist.shows || []).some(show => Number(show.year) >= 2026);

        artistMap.set(key, existing);
      }
    }

    return Array.from(artistMap.values());
  }

  const artistRows = artistCsv ? parseCsv(artistCsv) : await loadExtractedArtistRows();
  const openingsSearchText = ` ${normalizeSearchText(openingsMd)} `;
  const activeGalleries = new Set(
    galleryRows
      .filter(row => row.status === 'active')
      .map(row => row.name.toLowerCase())
  );
  const topGallerySignals = topGallerySignalsJson
    ? JSON.parse(topGallerySignalsJson)
    : seedGalleries.filter(gallery => ['major', 'mega'].includes(gallery.tier));
  const topGalleryNames = new Set(
    topGallerySignals
      .flatMap(gallery => [gallery.name, ...(gallery.aliases || [])])
      .filter(Boolean)
      .map(name => name.toLowerCase())
  );

  const artists = artistRows
    .filter(row => row.name && row.name.trim())
    .map((row, index) => {
      const galleries = parseGalleryList(row.galleries_exhibited);
      const normalizedGalleries = galleries.map(gallery => gallery.toLowerCase());
      const activeGalleryCount = normalizedGalleries.filter(gallery => activeGalleries.has(gallery)).length;
      const topGalleryCount = normalizedGalleries.filter(gallery => topGalleryNames.has(gallery)).length;
      const instagram = extractInstagram(row.instagram);
      const instagramFollowers = parseFollowers(row.instagram_followers);
      const website = normalizeExternalUrl(row.website);
      const cvUrl = normalizeExternalUrl(row.cv_url, website);
      const hasWebsite = Boolean(website);
      const hasCv = Boolean(cvUrl);
      const hasInstagram = Boolean(instagram);
      const artistSearchName = normalizeSearchText(row.name.trim());
      const recentOpening = Boolean(row._recentOpening) ||
        (artistSearchName && openingsSearchText.includes(` ${artistSearchName} `));
      const confidenceInputs = [
        galleries.length > 0,
        hasWebsite,
        hasCv,
        hasInstagram,
        activeGalleryCount > 0,
      ];
      const confidence = confidenceInputs.filter(Boolean).length / confidenceInputs.length;

      const signals = {
        galleryCount: galleries.length,
        topGalleryCount,
        hasWebsite,
        hasCv,
        hasInstagram,
        instagramFollowers,
        recentOpening,
        confidence,
      };

      const gallerySignal = Math.min(galleries.length / 5, 1) * 100;
      const sourceSignal = (hasCv ? 40 : 0) + (hasWebsite ? 30 : 0) + (hasInstagram ? 30 : 0);
      const socialSignal = instagramFollowers ? softScale(instagramFollowers, 100000) : (hasInstagram ? 42 : 0);
      const eventSignal = recentOpening ? 100 : 0;
      const qualitySignal = Math.min((topGalleryCount * 55) + (galleries.length * 7), 100);

      return {
        id: row.id || `artist-${index}`,
        name: row.name.trim(),
        slug: row.slug || '',
        website,
        instagram,
        cvUrl,
        instagramFollowers,
        galleries,
        galleryCount: galleries.length,
        activeGalleryCount,
        topGalleryCount,
        hasWebsite,
        hasCv,
        hasInstagram,
        recentOpening,
        confidence,
        confidenceLabel: `${Math.round(confidence * 100)}%`,
        stage: deriveStage({ galleryCount: galleries.length, topGalleryCount, hasCv, hasWebsite }),
        signalBreakdown: {
          gallery: Math.round(gallerySignal),
          source: Math.round(sourceSignal),
          social: Math.round(socialSignal),
          event: Math.round(eventSignal),
          quality: Math.round(qualitySignal),
        },
        scores: computeScores(signals),
      };
    });

  const rankedArtists = getRankedArtistUnion(
    artists,
    WINDOWS.map(item => item.id),
    RANK_LIMIT_PER_WINDOW
  );

  return {
    props: {
      initialArtists: rankedArtists,
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceStats: {
        artistCount: rankedArtists.length,
        totalArtistCount: artists.length,
        galleryCount: galleryRows.length,
        activeGalleryCount: activeGalleries.size,
        withCv: rankedArtists.filter(artist => artist.hasCv).length,
        withInstagram: rankedArtists.filter(artist => artist.hasInstagram).length,
      },
    },
  };
}
