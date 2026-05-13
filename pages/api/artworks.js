// pages/api/artworks.js
// Returns all artists with their artworks from the v2 schema
// Falls back to legacy mytable if v2 has no data yet

import { prisma } from '../../prisma/globalprisma'
import { withRateLimit } from '../../lib/middleware/rateLimit'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // ── Try v2 schema first ────────────────────────────────────────────────────
    const artists = await prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        nationality: true,
        active: true,
        comprehend_tags: true,
        artworks: {
          select: {
            id: true,
            title: true,
            medium: true,
            medium_secondary: true,
            price_range: true,
            year: true,
            show_name: true,
            gallery_name: true,
            image_url: true,
            thumbnail_url: true,
            rekognition_labels: true,
            dominant_colors: true,
          },
          orderBy: { year: 'desc' }
        },
        metrics: {
          select: {
            search_hits: true,
            profile_views: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // If v2 has data, return it
    if (artists.length > 0) {
      // Serialize BigInt → string
      const serialized = artists.map(a => ({
        ...a,
        id: a.id.toString(),
        artworks: a.artworks.map(aw => ({
          ...aw,
          id: aw.id.toString(),
        }))
      }))
      return res.status(200).json(serialized)
    }

    // ── Fallback: legacy mytable ───────────────────────────────────────────────
    console.log('v2 schema empty, falling back to legacy mytable')
    const legacy = await prisma.mytable.findMany({
      select: {
        id: true,
        artist: true,
        medium1: true,
        medium2: true,
        price_range: true,
      }
    })

    const legacySerialized = legacy.map(row => ({
      ...row,
      id: row.id.toString(),
    }))

    return res.status(200).json(legacySerialized)

  } catch (error) {
    console.error('GET /api/artworks error:', error)
    return res.status(500).json({ error: 'Failed to fetch artworks' })
  }
}

export default withRateLimit(handler, { windowMs: 60_000, max: 60, routeKey: 'artworks-v1' })
