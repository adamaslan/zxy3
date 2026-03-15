// lambda/enrichArtist.js
// Triggered by EventBridge when a new Artist row is inserted
// Calls Gemini 1.5 Flash for tag extraction + Google Cloud Vision for image analysis
// Writes results back to CockroachDB via direct Prisma query

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`
const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`

// Strip characters that could break out of XML-like prompt tags or inject new instructions
function sanitizeForPrompt(value, maxLength = 500) {
  if (!value) return ''
  return String(value)
    .replace(/[<>]/g, '')        // remove tag delimiters
    .replace(/[\x00-\x1F]/g, '') // remove control characters
    .slice(0, maxLength)
    .trim()
}

// ─── GEMINI: Extract tags from artist bio ─────────────────────────────────────
async function extractTagsWithGemini(artistName, bio) {
  const safeName = sanitizeForPrompt(artistName, 100)
  const safeBio = sanitizeForPrompt(bio, 500) || 'No bio available. Generate tags based on name context only.'

  const prompt = `
You are an art world expert. Given this artist's name and bio, extract structured tags.
Return ONLY a JSON array of strings. No explanation, no markdown, no backticks.
Include: art movements, mediums, themes, geographic associations, and EXACTLY ONE career stage.

Career stage MUST be one of these four exact strings (pick the best fit):
- "emerging artist"
- "mid-career artist"
- "established artist"
- "late-career artist"

Limit to 10 tags maximum (including the career stage).

<artist_name>${safeName}</artist_name>
<artist_bio>${safeBio}</artist_bio>

Example output: ["oil painting", "abstract expressionism", "New York", "mid-career artist", "portraiture"]
`

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 }
    })
  })

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

  try {
    return JSON.parse(text.trim())
  } catch {
    // fallback: extract anything that looks like a tag
    const matches = text.match(/"([^"]+)"/g) || []
    return matches.map(m => m.replace(/"/g, ''))
  }
}

// ─── GEMINI: Generate artist bio ──────────────────────────────────────────────
async function generateBioWithGemini(artistName) {
  const safeName = sanitizeForPrompt(artistName, 100)
  const prompt = `
Write a concise 2-sentence professional bio for the artist whose name is in <artist_name> tags.
<artist_name>${safeName}</artist_name>
If this is a real artist you know, use factual information.
If unknown, write a plausible art-world bio in a neutral tone.
Do not fabricate specific exhibition dates or gallery names.
Return only the bio text, no quotes, no formatting.
`

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
    })
  })

  const data = await response.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
}

// ─── GOOGLE VISION: Analyze artwork image ─────────────────────────────────────

// Allowlist of trusted image hosting domains
const ALLOWED_IMAGE_HOSTS = [
  's3.amazonaws.com',
  's3.us-east-1.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  'storage.googleapis.com',
  'res.cloudinary.com',
  'images.unsplash.com',
  'uploads.zxygallery.com',
]

function isAllowedImageUrl(imageUrl) {
  let parsed
  try {
    parsed = new URL(imageUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  return ALLOWED_IMAGE_HOSTS.some(
    host => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
  )
}

async function analyzeImageWithVision(imageUrl) {
  if (!isAllowedImageUrl(imageUrl)) {
    throw new Error(`Image URL not allowed: ${imageUrl}`)
  }

  const response = await fetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'IMAGE_PROPERTIES', maxResults: 5 },
        ]
      }]
    })
  })

  const data = await response.json()
  const result = data?.responses?.[0]

  const labels = (result?.labelAnnotations || [])
    .map(l => l.description)

  const colors = (result?.imagePropertiesAnnotation?.dominantColors?.colors || [])
    .slice(0, 5)
    .map(c => {
      const r = Math.round(c.color.red || 0)
      const g = Math.round(c.color.green || 0)
      const b = Math.round(c.color.blue || 0)
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    })

  return { labels, colors }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  console.log('enrichArtist Lambda triggered:', JSON.stringify(event))

  // EventBridge passes artist_id in detail
  const artistId = event?.detail?.artist_id || event?.artist_id
  if (!artistId) {
    console.error('No artist_id in event')
    return { statusCode: 400, body: 'Missing artist_id' }
  }

  try {
    // 1. Fetch artist from DB
    const artist = await prisma.artist.findUnique({
      where: { id: BigInt(artistId) },
      include: { artworks: { take: 1 } }
    })

    if (!artist) {
      console.error(`Artist ${artistId} not found`)
      return { statusCode: 404, body: 'Artist not found' }
    }

    console.log(`Enriching artist: ${artist.name}`)

    // 2. Generate bio if missing
    let bioUpdate = {}
    if (!artist.bio) {
      const generatedBio = await generateBioWithGemini(artist.name)
      if (generatedBio) {
        bioUpdate = { bio: generatedBio, bio_generated: true }
        console.log(`Generated bio for ${artist.name}`)
      }
    }

    // 3. Extract tags via Gemini
    const tags = await extractTagsWithGemini(artist.name, artist.bio || bioUpdate.bio)
    console.log(`Tags for ${artist.name}:`, tags)

    // 4. Update artist in DB
    await prisma.artist.update({
      where: { id: BigInt(artistId) },
      data: {
        ...bioUpdate,
        comprehend_tags: tags,
        comprehend_ran: new Date(),
      }
    })

    // 5. Analyze artwork images if any exist
    const artworksWithImages = artist.artworks.filter(a => a.image_url)
    for (const artwork of artworksWithImages) {
      try {
        const { labels, colors } = await analyzeImageWithVision(artwork.image_url)
        await prisma.artwork.update({
          where: { id: artwork.id },
          data: {
            rekognition_labels: labels,
            dominant_colors: colors,
            rek_ran: new Date(),
          }
        })
        console.log(`Vision analysis complete for artwork ${artwork.id}`)
      } catch (imgErr) {
        console.error(`Vision API failed for artwork ${artwork.id}:`, imgErr.message)
      }
    }

    console.log(`✅ Enrichment complete for ${artist.name}`)
    return { statusCode: 200, body: `Enriched artist ${artistId}` }

  } catch (err) {
    console.error('Lambda enrichment failed:', err)
    return { statusCode: 500, body: 'Internal server error' }
  }
}
