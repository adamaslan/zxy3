/**
 * /artists - Gallery Explorer
 * Showcases all artists with search, career stage filter, and trending rankings
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const CAREER_STAGES = ['all', 'emerging artist', 'mid-career artist', 'established artist', 'late-career artist'];

const STAGE_COLORS = {
  'emerging artist':    { bg: '#e8f5e9', border: '#66bb6a', text: '#2e7d32' },
  'mid-career artist':  { bg: '#e3f2fd', border: '#42a5f5', text: '#1565c0' },
  'established artist': { bg: '#fff3e0', border: '#ffa726', text: '#e65100' },
  'late-career artist': { bg: '#f3e5f5', border: '#ab47bc', text: '#6a1b9a' },
};

function CareerBadge({ stage }) {
  const c = STAGE_COLORS[stage];
  if (!c) return null;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>
      {stage.replace(' artist', '')}
    </span>
  );
}

function TagPill({ tag }) {
  const stage = CAREER_STAGES.slice(1).find(s => s === tag);
  if (stage) return <CareerBadge stage={stage} />;
  return (
    <span style={{
      background: '#f5f5f5', border: '1px solid #e0e0e0', color: '#555',
      borderRadius: 4, padding: '2px 7px', fontSize: 11,
    }}>
      {tag}
    </span>
  );
}

function ArtistCard({ artist }) {
  const careerStage = artist.comprehend_tags?.find(t => CAREER_STAGES.includes(t));
  const otherTags = (artist.comprehend_tags || []).filter(t => !CAREER_STAGES.includes(t)).slice(0, 4);

  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10,
      padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'box-shadow 0.15s', cursor: 'pointer',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111' }}>{artist.name}</h3>
        {careerStage && <CareerBadge stage={careerStage} />}
      </div>

      {artist.bio && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#555', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {artist.bio}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {otherTags.map(t => <TagPill key={t} tag={t} />)}
      </div>

      {artist.gallery && (
        <div style={{ fontSize: '0.78rem', color: '#888', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          {artist.gallery.name} · {artist.gallery.city}
        </div>
      )}
    </div>
  );
}

function TrendingRow({ artist, rank }) {
  const careerStage = artist.comprehend_tags?.find(t => CAREER_STAGES.includes(t));
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <span style={{ width: 28, fontWeight: 700, color: '#bbb', fontSize: '0.9rem', textAlign: 'right' }}>
        {rank}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{artist.name}</span>
          {careerStage && <CareerBadge stage={careerStage} />}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>
          Score: {artist.trendScore?.toFixed(1)} · Views: {artist.metrics?.viewCount ?? 0}
        </div>
      </div>
    </div>
  );
}

export default function ArtistsPage({ initialArtists, totalCount }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [careerFilter, setCareerFilter] = useState('all');
  const [artists, setArtists] = useState(initialArtists || []);
  const [total, setTotal] = useState(totalCount || 0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const [trendWindow, setTrendWindow] = useState('7d');
  const [trending, setTrending] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [stageCounts, setStageCounts] = useState(() =>
    CAREER_STAGES.slice(1).reduce((acc, s) => {
      acc[s] = initialArtists?.filter(a => (a.comprehend_tags || []).includes(s)).length || 0;
      return acc;
    }, {})
  );

  const LIMIT = 24;

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch artists on filter/page change
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({
      limit: LIMIT,
      offset: page * LIMIT,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(careerFilter !== 'all' && { careerStage: careerFilter }),
    });

    fetch(`/api/v2/artists?${params}`)
      .then(r => r.json())
      .then(data => {
        if (!active) return;
        if (data.status === 'success') {
          setArtists(data.data || []);
          setTotal(data.meta?.pagination?.total || 0);
          if (data.meta?.stageCounts) setStageCounts(data.meta.stageCounts);
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [debouncedSearch, careerFilter, page]);

  // Fetch trending
  useEffect(() => {
    setTrendLoading(true);
    fetch(`/api/v2/trending/artists?window=${trendWindow}&limit=10`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') setTrending(data.data || []);
      })
      .finally(() => setTrendLoading(false));
  }, [trendWindow]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [debouncedSearch, careerFilter]);

  return (
    <>
      <Head>
        <title>Artists — ZXY Gallery</title>
        <meta name="description" content="Explore artists on ZXY Gallery" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>

        {/* Header */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e8e8e8',
          padding: '1rem 2rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10
        }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.2rem', color: '#111', textDecoration: 'none' }}>
            ZXY Gallery
          </Link>
          <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
            <Link href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
            <Link href="/posts/artists" style={{ color: '#f30000c0', textDecoration: 'none', fontWeight: 600 }}>Artists</Link>
            <Link href="/trending" style={{ color: '#555', textDecoration: 'none' }}>Trending</Link>
            <Link href="/posts/pastshows" style={{ color: '#555', textDecoration: 'none' }}>Shows</Link>
          </nav>
        </header>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 280px', gap: '2rem' }}>

          {/* Main column */}
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800 }}>Artists</h1>
              <p style={{ margin: 0, color: '#777', fontSize: '0.9rem' }}>{total} artists in the database</p>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Search artists..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem',
                  border: '1px solid #ddd', borderRadius: 8, fontSize: '0.95rem',
                  outline: 'none', background: '#fff', boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: '1rem' }}>
                &#128269;
              </span>
            </div>

            {/* Career stage filter */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {CAREER_STAGES.map(s => {
                const active = careerFilter === s;
                const c = STAGE_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => setCareerFilter(s)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: active ? (c?.bg || '#111') : '#fff',
                      border: `1.5px solid ${active ? (c?.border || '#111') : '#ddd'}`,
                      color: active ? (c?.text || '#fff') : '#555',
                    }}
                  >
                    {s === 'all' ? `All (${total})` : `${s.replace(' artist', '')}${stageCounts[s] ? ` (${stageCounts[s]})` : ''}`}
                  </button>
                );
              })}
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>Loading...</div>
            ) : artists.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>No artists found.</div>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1rem'
                }}>
                  {artists.map(a => <ArtistCard key={a.id} artist={a} />)}
                </div>

                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: '2rem' }}>
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{
                      padding: '8px 18px', borderRadius: 6, border: '1px solid #ddd',
                      background: page === 0 ? '#f5f5f5' : '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer',
                      color: page === 0 ? '#bbb' : '#333'
                    }}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: '0.85rem', color: '#888' }}>
                    Page {page + 1} of {Math.ceil(total / LIMIT) || 1}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * LIMIT >= total}
                    style={{
                      padding: '8px 18px', borderRadius: 6, border: '1px solid #ddd',
                      background: (page + 1) * LIMIT >= total ? '#f5f5f5' : '#fff',
                      cursor: (page + 1) * LIMIT >= total ? 'not-allowed' : 'pointer',
                      color: (page + 1) * LIMIT >= total ? '#bbb' : '#333'
                    }}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Sidebar: Trending */}
          <aside>
            <div style={{
              background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10,
              padding: '1.2rem', position: 'sticky', top: 72
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Trending</h2>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['7d', '30d', '90d'].map(w => (
                    <button
                      key={w}
                      onClick={() => setTrendWindow(w)}
                      style={{
                        padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem',
                        border: '1px solid #ddd', cursor: 'pointer',
                        background: trendWindow === w ? '#111' : '#fff',
                        color: trendWindow === w ? '#fff' : '#555',
                        fontWeight: trendWindow === w ? 700 : 400
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {trendLoading ? (
                <div style={{ color: '#aaa', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Loading...</div>
              ) : trending.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No trending data yet.<br />
                  <span style={{ fontSize: '0.75rem' }}>Run the cron job to compute rankings.</span>
                </div>
              ) : (
                trending.map((a, i) => <TrendingRow key={a.artistId} artist={a} rank={i + 1} />)
              )}

              <Link href="/trending" style={{
                display: 'block', textAlign: 'center', marginTop: '1rem',
                fontSize: '0.82rem', color: '#f30000c0', textDecoration: 'none', fontWeight: 600
              }}>
                Full leaderboard →
              </Link>
            </div>

            {/* Career stage legend */}
            <div style={{
              background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10,
              padding: '1.2rem', marginTop: '1rem'
            }}>
              <h2 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 700 }}>Career Stages</h2>
              {CAREER_STAGES.slice(1).map(s => {
                const c = STAGE_COLORS[s];
                return (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <CareerBadge stage={s} />
                    <span style={{ fontSize: '0.82rem', color: '#888' }}>{stageCounts[s] || 0} artists</span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  const { prisma } = require('../../prisma/globalprisma');

  const [artists, total] = await Promise.all([
    prisma.artist.findMany({
      take: 24,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        bio: true,
        comprehend_tags: true,
        gallery_links: {
          take: 1,
          select: {
            gallery: { select: { name: true, city: true } }
          }
        }
      }
    }),
    prisma.artist.count()
  ]);

  const formatted = artists.map(a => ({
    id: a.id.toString(),
    name: a.name,
    bio: a.bio || null,
    comprehend_tags: a.comprehend_tags || [],
    gallery: a.gallery_links?.[0]?.gallery || null,
  }));

  return { props: { initialArtists: formatted, totalCount: total } };
}
