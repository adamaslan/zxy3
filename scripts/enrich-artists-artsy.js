#!/usr/bin/env node

/**
 * Artsy Artist Enrichment Script
 *
 * For each artist in the DB, queries the Artsy public API to find:
 *   - Artsy profile URL and ID
 *   - Profile image URL
 *   - Biography
 *   - Career stage (emerging / mid-career / established / late-career)
 *   - Solo and group show counts
 *   - Highest auction sale price
 *   - Website and CV URL (if listed on Artsy)
 *   - Instagram handle
 *
 * Also enriches galleries with website URLs and computes gallery_tier.
 *
 * Usage:
 *   node scripts/enrich-artists-artsy.js
 *   node scripts/enrich-artists-artsy.js --dry-run        # preview without writing
 *   node scripts/enrich-artists-artsy.js --artist-id 42   # single artist
 *
 * Artsy public API docs: https://developers.artsy.net/v2
 * Rate limit: ~5 req/s with a public client_id/secret
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_ID = (() => {
  const idx = args.indexOf('--artist-id');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : null;
})();

// ─── Artsy API config ────────────────────────────────────────────────────────
const ARTSY_API_BASE = 'https://api.artsy.net/api';
const ARTSY_CLIENT_ID = process.env.ARTSY_CLIENT_ID;
const ARTSY_CLIENT_SECRET = process.env.ARTSY_CLIENT_SECRET;

// Delay between API calls (ms) to respect rate limits
const API_DELAY_MS = 300;

// ─── Gallery website map (hand-curated for known galleries) ─────────────────
// Used when Artsy doesn't have the website on record.
const GALLERY_WEBSITE_MAP = {
  "King's Leap":                         'https://kingsleap.com',
  '15 Orient':                           'https://15orient.com',
  'Magenta Plains':                      'https://www.magentaplains.com',
  'Diana New York':                      'https://www.diananewyork.com',
  'KIPNZ':                               'https://kipnz.com',
  "Jenny's":                             'https://www.jennysla.com',
  'Bakehouse Art Complex':               'https://www.bacfl.org',
  'ZXY Gallery':                         null,
  'Luhring Augustine':                   'https://www.luhringaugustine.com',
  'Clearing':                            'https://www.clearing-gallery.com',
  'Underdonk':                           'https://www.underdonk.gallery',
  'Paradice Palase':                     'https://www.paradicepalase.com',
  'Tiger Strikes Asteroid':              'https://www.tigerstrikesasteroid.com',
  'Mery Gates':                          'https://www.merygates.com',
  'David Zwirner':                       'https://www.davidzwirner.com',
  'Amos Eno Gallery':                    'https://www.amoseno.com',
  'SoMad':                               null,
  'Microscope Gallery':                  'https://www.microscopegallery.com',
  'Galerie Manque':                      null,
  'Provincetown Art Association & Museum': 'https://www.paam.org',
  'Tanya Bondakar Gallery':              null,
  '550 Gallery':                         'https://www.550gallery.com',
  'Radiator Gallery':                    'https://www.radiatorgallery.com',
  'Signal Gallery':                      null,
  'The Border':                          null,
  'Alexandra Arts / ART511MAG':          null,
  'Robert Miller Gallery':               'https://www.robertmillergallery.com',
  'James Cohan':                         'https://www.jamescohan.com',
  'Alt Esc':                             null,
  'Winston Wächter Fine Art':            'https://www.winstonwachter.com',
  'Jorge Andrew Gallery':                null,
  'International Gallery':               null,
  "Carpenter's Workshop Gallery":        'https://www.carpentersworkshopgallery.com',
  'Galeria Agustina Ferreyra':           'https://www.galeriaafereyra.com',
  'Mana Contemporary':                   'https://www.manacontemporary.com',
  'Honey Ramka':                         'https://www.honeyramka.com',
  'Museum of Modern Art':                'https://www.moma.org',
  'The Metropolitan Museum of Art':      'https://www.metmuseum.org',
  'Jewish Museum in South Beach':        'https://www.jewishmuseumfl.org',
  'The Bass':                            'https://www.thebass.org',
  'The New Museum':                      'https://www.newmuseum.org',
  'Pioneer Works':                       'https://pioneerworks.org',
  'Pratt Institute':                     'https://www.pratt.edu',
  'The Strzeminski Academy of Fine Arts': 'https://www.asp.lodz.pl',
  'The Armory Show':                     'https://www.thearmoryshow.com',
  'Art Basel':                           'https://www.artbasel.com',
  'Untitled Art Fair':                   'https://www.untitledartfair.com',
  'Frieze LA':                           'https://www.frieze.com',
  'Spring/Break Art Show':               'https://www.springbreakartshow.com',
  'Satellite Art Show':                  'https://www.satelliteartshow.com',
  'Felix Art Show':                      'https://www.felixartfair.com',
  'Tempest':                             'https://www.tempestonweirfield.com',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch JSON from a URL with optional Authorization header.
 * Returns null on any error.
 */
async function fetchJSON(url, token = null) {
  const headers = { 'Accept': 'application/json' };
  if (token) headers['X-Access-Token'] = token;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Obtain a short-lived Artsy API token.
 * Falls back to unauthenticated (public) requests if no credentials set.
 */
async function getArtsyToken() {
  if (!ARTSY_CLIENT_ID || !ARTSY_CLIENT_SECRET) {
    console.warn('[Artsy] No ARTSY_CLIENT_ID/SECRET — using public (unauthenticated) API');
    return null;
  }

  const res = await fetchJSON(`${ARTSY_API_BASE}/tokens/xapp_token?client_id=${ARTSY_CLIENT_ID}&client_secret=${ARTSY_CLIENT_SECRET}`);
  return res?.token ?? null;
}

/**
 * Search Artsy for an artist by name.
 * Returns the first matching artist object or null.
 */
async function searchArtsyArtist(name, token) {
  const q = encodeURIComponent(name);
  const url = `${ARTSY_API_BASE}/search?q=${q}&size=3&type=artist`;
  const data = await fetchJSON(url, token);
  if (!data?._embedded?.results?.length) return null;

  // Pick the result whose title matches closest (case-insensitive)
  const nameLower = name.toLowerCase();
  const results = data._embedded.results;

  const exact = results.find(r => r.title?.toLowerCase() === nameLower);
  return exact || results[0];
}

/**
 * Fetch full artist detail from Artsy given a self href.
 */
async function getArtsyArtistDetail(href, token) {
  return fetchJSON(href, token);
}

/**
 * Fetch artist shows from Artsy to count solo vs group.
 */
async function getArtsyShowCounts(artsyId, token) {
  const url = `${ARTSY_API_BASE}/shows?artist_id=${artsyId}&size=100`;
  const data = await fetchJSON(url, token);
  if (!data?._embedded?.shows) return { solo: 0, group: 0 };

  let solo = 0;
  let group = 0;
  for (const show of data._embedded.shows) {
    if (show.artists_without_artworks_count <= 1 || show.artists?.length === 1) {
      solo++;
    } else {
      group++;
    }
  }
  return { solo, group };
}

/**
 * Fetch auction results from Artsy for highest sale price.
 */
async function getArtsyHighestSale(artsyId, token) {
  const url = `${ARTSY_API_BASE}/sale_artworks?artist_id=${artsyId}&size=10&sort=-hammer_price_cents`;
  const data = await fetchJSON(url, token);
  if (!data?._embedded?.sale_artworks?.length) return null;

  const top = data._embedded.sale_artworks[0];
  if (!top?.hammer_price_cents) return null;

  return {
    price: top.hammer_price_cents / 100,
    currency: top.currency || 'USD',
    source: 'artsy',
  };
}

/**
 * Derive career_stage from Artsy data.
 * Logic: uses birth year + nationality field as proxy.
 * Falls back to show count heuristic if birth year unavailable.
 */
function deriveCareerStage(artsyData, soloShows, groupShows) {
  const birthYear = artsyData?.birthday ? parseInt(artsyData.birthday, 10) : null;
  const currentYear = 2026;
  const totalShows = soloShows + groupShows;

  if (birthYear && !isNaN(birthYear)) {
    const age = currentYear - birthYear;
    if (age < 35 && totalShows < 10) return 'emerging';
    if (age < 45 && totalShows < 30) return 'mid-career';
    if (age < 65) return 'established';
    return 'late-career';
  }

  // Fall back to show count heuristic
  if (totalShows < 5) return 'emerging';
  if (totalShows < 20) return 'mid-career';
  if (totalShows < 60) return 'established';
  return 'late-career';
}

/**
 * Compute gallery_tier based on the career stages of its artists.
 * Categories:
 *   mega      — majority established/late-career (blue-chip)
 *   major     — mix of established + mid-career
 *   mid       — majority mid-career
 *   emerging  — majority emerging artists
 */
function computeGalleryTier(stageCounts) {
  const { emerging = 0, 'mid-career': mid = 0, established = 0, 'late-career': late = 0 } = stageCounts;
  const total = emerging + mid + established + late;
  if (total === 0) return null;

  const topTier = (established + late) / total;
  const midTier = mid / total;
  const emergingTier = emerging / total;

  if (topTier >= 0.5) return 'mega';
  if (topTier >= 0.25 || midTier >= 0.4) return 'major';
  if (midTier >= 0.4 || emergingTier < 0.6) return 'mid';
  return 'emerging';
}

// ─── Main enrichment logic ───────────────────────────────────────────────────

async function enrichArtist(artist, token) {
  console.log(`\n[${artist.id}] ${artist.name}`);

  const searchResult = await searchArtsyArtist(artist.name, token);
  await sleep(API_DELAY_MS);

  if (!searchResult) {
    console.log(`  → Not found on Artsy`);
    return null;
  }

  const selfHref = searchResult._links?.self?.href;
  const detail = selfHref ? await getArtsyArtistDetail(selfHref, token) : null;
  await sleep(API_DELAY_MS);

  const artsyId = detail?.id || searchResult.id || null;
  const artsyUrl = detail?._links?.permalink?.href || null;
  const profileImageUrl = detail?._links?.image?.href?.replace('{image_version}', 'square') || null;

  let soloShows = 0;
  let groupShows = 0;
  let highestSale = null;

  if (artsyId) {
    const counts = await getArtsyShowCounts(artsyId, token);
    soloShows = counts.solo;
    groupShows = counts.group;
    await sleep(API_DELAY_MS);

    highestSale = await getArtsyHighestSale(artsyId, token);
    await sleep(API_DELAY_MS);
  }

  const careerStage = deriveCareerStage(detail, soloShows, groupShows);

  const updates = {
    artsy_id:                artsyId,
    artsy_url:               artsyUrl,
    profile_image_url:       profileImageUrl,
    show_count_solo:         soloShows,
    show_count_group:        groupShows,
    career_stage:            careerStage,
    artsy_enriched_at:       new Date(),
  };

  // Only overwrite website/cv/instagram if currently null
  if (!artist.website && detail?.hometown) {
    // Artsy doesn't expose website directly in the public API — skip
  }
  if (!artist.instagram && detail?.instagram) {
    updates.instagram = detail.instagram.startsWith('@') ? detail.instagram : `@${detail.instagram}`;
  }
  if (detail?.blurb && !artist.bio) {
    updates.bio = detail.blurb;
  }
  if (highestSale) {
    updates.highest_sale_price    = highestSale.price;
    updates.highest_sale_currency = highestSale.currency;
    updates.highest_sale_source   = highestSale.source;
  }

  console.log(`  → Artsy ID: ${artsyId}`);
  console.log(`  → Career stage: ${careerStage} (solo: ${soloShows}, group: ${groupShows})`);
  if (highestSale) console.log(`  → Highest sale: ${highestSale.currency} ${highestSale.price}`);

  return { artistId: artist.id, updates };
}

async function enrichGalleries() {
  console.log('\n─── Enriching gallery websites ───');
  const galleries = await prisma.gallery.findMany({ select: { id: true, name: true, website: true } });

  for (const gallery of galleries) {
    const knownUrl = GALLERY_WEBSITE_MAP[gallery.name];
    if (gallery.website || knownUrl === undefined) continue;
    if (knownUrl === null) continue; // explicitly no known URL

    if (!DRY_RUN) {
      await prisma.gallery.update({
        where: { id: gallery.id },
        data: { website: knownUrl },
      });
    }
    console.log(`  ${gallery.name} → ${knownUrl}`);
  }
}

async function computeGalleryTiers() {
  console.log('\n─── Computing gallery tiers ───');

  // Get all artist-gallery links with career stages
  const links = await prisma.artistGallery.findMany({
    include: { artist: { select: { career_stage: true } } },
  });

  // Build per-gallery stage counts
  const galleryStages = {};
  for (const link of links) {
    const stage = link.artist.career_stage;
    if (!stage) continue;
    if (!galleryStages[link.gallery_id]) galleryStages[link.gallery_id] = {};
    galleryStages[link.gallery_id][stage] = (galleryStages[link.gallery_id][stage] || 0) + 1;
  }

  // For galleries with no artist links, default to 'emerging'
  const galleries = await prisma.gallery.findMany({ select: { id: true, name: true, type: true } });
  for (const gallery of galleries) {
    let tier;
    if (galleryStages[gallery.id]) {
      tier = computeGalleryTier(galleryStages[gallery.id]);
    } else {
      // Museums and institutions get established by default
      tier = ['museum', 'institution'].includes(gallery.type) ? 'mega' : 'emerging';
    }

    console.log(`  ${gallery.name} → ${tier}`);

    if (!DRY_RUN) {
      await prisma.gallery.update({ where: { id: gallery.id }, data: { gallery_tier: tier } });
    }
  }
}

async function syncMetricsFromArtist(artistId, updates) {
  // Mirror show counts and sale price into all metric windows
  const metricUpdate = {};
  if (updates.show_count_solo !== undefined) metricUpdate.solo_show_count = updates.show_count_solo;
  if (updates.show_count_group !== undefined) metricUpdate.group_show_count = updates.show_count_group;
  if (updates.highest_sale_price !== undefined) metricUpdate.highest_sale_price = updates.highest_sale_price;

  if (!Object.keys(metricUpdate).length) return;

  await prisma.artistMetrics.updateMany({
    where: { artistId: BigInt(artistId) },
    data: metricUpdate,
  });
}

async function main() {
  console.log(DRY_RUN ? '── DRY RUN ──' : '── Writing to DB ──');

  const token = await getArtsyToken();

  // Step 1: Enrich gallery websites (no API needed)
  await enrichGalleries();

  // Step 2: Enrich artists via Artsy
  console.log('\n─── Enriching artists via Artsy ───');

  const where = SINGLE_ID ? { id: BigInt(SINGLE_ID) } : {};
  const artists = await prisma.artist.findMany({
    where,
    select: { id: true, name: true, website: true, instagram: true, bio: true, artsy_enriched_at: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${artists.length} artist(s) to process`);

  const enriched = [];
  for (const artist of artists) {
    const result = await enrichArtist(artist, token);
    if (!result) continue;

    enriched.push(result);

    if (!DRY_RUN) {
      await prisma.artist.update({
        where: { id: BigInt(result.artistId) },
        data: result.updates,
      });
      await syncMetricsFromArtist(result.artistId, result.updates);
    }
  }

  // Step 3: Compute gallery tiers (needs career_stage populated first)
  await computeGalleryTiers();

  console.log(`\n✓ Enriched ${enriched.length} of ${artists.length} artists`);
  if (DRY_RUN) console.log('(dry run — no writes made)');
}

main()
  .catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
