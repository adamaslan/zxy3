// pages/api/search.js
// Server-side DB filtering via Prisma — replaces client-side filter in ArtworkSearchTable
// Use this instead of fetching all records from /api/artworks and filtering in-browser
//
// Usage:
//   GET /api/search?q=oil
//   GET /api/search?q=sarah+sze
//   GET /api/search?q=luhring&type=gallery
//   GET /api/search?q=moma&type=museum

import { prisma } from '../../prisma/globalprisma'
import { withRateLimit } from '../../lib/middleware/rateLimit'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Support both ?q= (new) and ?searchDB= (legacy) param names
  const query = (req.query.q || req.query.searchDB || '').trim()
  const type = req.query.type || 'all' // "artist" | "gallery" | "museum" | "all"

  if (!query) {
    return res.status(400).json({ error: 'Missing search query. Use ?q=yourquery' })
  }

  try {
    const results = {}

    // ── Search Artists ─────────────────────────────────────────────────────────
    if (type === 'all' || type === 'artist') {
      const artists = await prisma.artist.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } },
            { nationality: { contains: query, mode: 'insensitive' } },
            // Search within comprehend_tags array
            { comprehend_tags: { has: query.toLowerCase() } },
            // Search through artworks
            {
              artworks: {
                some: {
                  OR: [
                    { medium: { contains: query, mode: 'insensitive' } },
                    { medium_secondary: { contains: query, mode: 'insensitive' } },
                    { price_range: { contains: query, mode: 'insensitive' } },
                    { show_name: { contains: query, mode: 'insensitive' } },
                    { gallery_name: { contains: query, mode: 'insensitive' } },
                  ]
                }
              }
            }
          ]
        },
        select: {
          id: true,
          name: true,
          slug: true,
          bio: true,
          comprehend_tags: true,
          artworks: {
            select: {
              id: true,
              medium: true,
              medium_secondary: true,
              price_range: true,
              show_name: true,
              gallery_name: true,
              image_url: true,
              thumbnail_url: true,
            },
            take: 3,
          }
        },
        take: 50,
        orderBy: { name: 'asc' }
      })

      results.artists = artists.map(a => ({
        ...a,
        id: a.id.toString(),
        artworks: a.artworks.map(aw => ({ ...aw, id: aw.id.toString() }))
      }))
    }

    // ── Search Galleries & Museums ─────────────────────────────────────────────
    if (type === 'all' || type === 'gallery' || type === 'museum') {
      const galleryTypeFilter =
        type === 'museum'
          ? { type: { in: ['museum', 'institution', 'art_fair'] } }
          : type === 'gallery'
          ? { type: { in: ['commercial', 'non-profit'] } }
          : {}

      const galleries = await prisma.gallery.findMany({
        where: {
          AND: [
            galleryTypeFilter,
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } },
                { country: { contains: query, mode: 'insensitive' } },
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          country: true,
          type: true,
          website: true,
        },
        take: 50,
        orderBy: { name: 'asc' }
      })

      results.galleries = galleries
    }

    // ── Legacy mytable fallback ────────────────────────────────────────────────
    // Only runs if v2 returned nothing
    const hasV2Results =
      (results.artists?.length > 0) || (results.galleries?.length > 0)

    if (!hasV2Results && (type === 'all' || type === 'artist')) {
      console.log('v2 search empty, falling back to legacy mytable')
      const legacy = await prisma.mytable.findMany({
        where: {
          OR: [
            { artist: { contains: query, mode: 'insensitive' } },
            { medium1: { contains: query, mode: 'insensitive' } },
            { medium2: { contains: query, mode: 'insensitive' } },
            { price_range: { contains: query, mode: 'insensitive' } },
          ]
        }
      })

      results.legacy = legacy.map(row => ({ ...row, id: row.id.toString() }))
    }

    return res.status(200).json({
      query,
      type,
      results,
      total: {
        artists: results.artists?.length || 0,
        galleries: results.galleries?.length || 0,
        legacy: results.legacy?.length || 0,
      }
    })

  } catch (error) {
    console.error('GET /api/search error:', error)
    return res.status(500).json({ error: 'Search failed' })
  }
}

export default withRateLimit(handler, { windowMs: 60_000, max: 30 });
