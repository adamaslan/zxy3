#!/usr/bin/env node

/**
 * Fetch NYC Galleries from Artsy API
 *
 * Queries the Artsy public API for galleries near New York City,
 * fetches their latest show/update date, and outputs a CSV.
 *
 * Usage:
 *   node scripts/fetch-nyc-galleries-artsy.js
 *   node scripts/fetch-nyc-galleries-artsy.js --output data/nyc-galleries.csv
 *
 * Requires ARTSY_CLIENT_ID and ARTSY_CLIENT_SECRET env vars.
 */

const fs = require('fs');
const path = require('path');

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const OUTPUT_PATH = (() => {
  const idx = args.indexOf('--output');
  return idx !== -1 ? args[idx + 1] : path.join(__dirname, '..', 'data', 'nyc-galleries.csv');
})();

// ─── Artsy API config ────────────────────────────────────────────────────────
const ARTSY_API_BASE = 'https://api.artsy.net/api';
const ARTSY_CLIENT_ID = process.env.ARTSY_CLIENT_ID;
const ARTSY_CLIENT_SECRET = process.env.ARTSY_CLIENT_SECRET;

const API_DELAY_MS = 300;
const MAX_GALLERIES = 200;
const PAGE_SIZE = 20; // Artsy default max per page

// NYC coordinates
const NYC_LAT = 40.71;
const NYC_LNG = -74.01;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url, token = null) {
  const headers = { 'Accept': 'application/json' };
  if (token) headers['X-Access-Token'] = token;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`[Artsy] HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`[Artsy] Fetch error for ${url}:`, error.message);
    return null;
  }
}

async function getArtsyToken() {
  if (!ARTSY_CLIENT_ID || !ARTSY_CLIENT_SECRET) {
    console.error('Error: ARTSY_CLIENT_ID and ARTSY_CLIENT_SECRET env vars are required.');
    console.error('Get credentials at https://developers.artsy.net/v2');
    process.exit(1);
  }

  const url = `${ARTSY_API_BASE}/tokens/xapp_token?client_id=${ARTSY_CLIENT_ID}&client_secret=${ARTSY_CLIENT_SECRET}`;
  const data = await fetchJSON(url);
  if (!data?.token) {
    console.error('Error: Failed to obtain Artsy API token. Check your credentials.');
    process.exit(1);
  }
  return data.token;
}

/**
 * Fetch the most recent show for a partner (gallery).
 * Returns the show's end_at or created_at date, whichever is latest.
 */
async function getLatestShowDate(partnerId, token) {
  const url = `${ARTSY_API_BASE}/shows?partner_id=${partnerId}&size=1&sort=-end_at&status=closed`;
  const data = await fetchJSON(url, token);

  const closedShow = data?._embedded?.shows?.[0];
  const closedDate = closedShow?.end_at || closedShow?.created_at || null;

  // Also check current/upcoming shows
  const currentUrl = `${ARTSY_API_BASE}/shows?partner_id=${partnerId}&size=1&sort=-created_at&status=current`;
  const currentData = await fetchJSON(currentUrl, token);
  const currentShow = currentData?._embedded?.shows?.[0];
  const currentDate = currentShow?.created_at || null;

  // Return the most recent of the two
  if (closedDate && currentDate) {
    return closedDate > currentDate ? closedDate : currentDate;
  }
  return closedDate || currentDate || null;
}

function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching up to ${MAX_GALLERIES} NYC galleries from Artsy API...\n`);

  const token = await getArtsyToken();

  const galleries = [];
  let offset = 0;
  let page = 1;

  while (galleries.length < MAX_GALLERIES) {
    const remaining = MAX_GALLERIES - galleries.length;
    const size = Math.min(PAGE_SIZE, remaining);

    const url = `${ARTSY_API_BASE}/partners?near=${NYC_LAT},${NYC_LNG}&type=gallery&size=${size}&offset=${offset}`;
    console.log(`Page ${page}: fetching ${size} galleries (offset ${offset})...`);

    const data = await fetchJSON(url, token);
    await sleep(API_DELAY_MS);

    const partners = data?._embedded?.partners;
    if (!partners || partners.length === 0) {
      console.log('No more galleries returned by API.');
      break;
    }

    for (const partner of partners) {
      if (galleries.length >= MAX_GALLERIES) break;

      const galleryId = partner.id;
      const name = partner.name || '';
      const region = partner.region || '';
      const website = partner._links?.website?.href || '';
      const artsyUrl = partner._links?.permalink?.href || '';
      const createdAt = partner.created_at || '';

      // Fetch latest show date
      console.log(`  [${galleries.length + 1}/${MAX_GALLERIES}] ${name}`);
      const latestShowDate = await getLatestShowDate(galleryId, token);
      await sleep(API_DELAY_MS);

      galleries.push({
        name,
        artsy_id: galleryId,
        region,
        website,
        artsy_url: artsyUrl,
        artsy_created_at: formatDate(createdAt),
        latest_show_date: formatDate(latestShowDate),
      });
    }

    offset += partners.length;
    page++;
  }

  // Build CSV
  const headers = ['name', 'artsy_id', 'region', 'website', 'artsy_url', 'artsy_created_at', 'latest_show_date'];
  const csvLines = [headers.join(',')];

  for (const g of galleries) {
    const row = headers.map(h => escapeCsvField(g[h]));
    csvLines.push(row.join(','));
  }

  const csv = csvLines.join('\n') + '\n';

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, csv, 'utf-8');

  console.log(`\n✓ Wrote ${galleries.length} galleries to ${OUTPUT_PATH}`);

  // Print summary
  const withShows = galleries.filter(g => g.latest_show_date).length;
  const recentlyActive = galleries.filter(g => {
    if (!g.latest_show_date) return false;
    const d = new Date(g.latest_show_date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return d >= oneYearAgo;
  }).length;

  console.log(`  ${withShows} have show history on Artsy`);
  console.log(`  ${recentlyActive} had shows within the last year`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
