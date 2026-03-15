/**
 * Re-enrichment script: re-runs Gemini tag extraction for all artists
 * using the updated prompt that enforces exactly one of 4 career stages.
 *
 * Usage:
 *   node scripts/re-enrich-tags.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`

function sanitizeForPrompt(value, maxLength = 500) {
  if (!value) return ''
  return String(value)
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F]/g, '')
    .slice(0, maxLength)
    .trim()
}

const VALID_CAREER_STAGES = [
  'emerging artist',
  'mid-career artist',
  'established artist',
  'late-career artist',
]

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

Artist: ${safeName}
Bio: ${safeBio}

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
    const matches = text.match(/"([^"]+)"/g) || []
    return matches.map(m => m.replace(/"/g, ''))
  }
}

function validateCareerStage(tags) {
  return tags.some(t => VALID_CAREER_STAGES.includes(t.toLowerCase()))
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY in environment')
    process.exit(1)
  }

  const artists = await prisma.artist.findMany({
    select: { id: true, name: true, bio: true, comprehend_tags: true }
  })

  console.log(`Re-enriching ${artists.length} artists...\n`)

  const results = { success: 0, failed: 0, missingCareerStage: 0 }

  for (const artist of artists) {
    try {
      const tags = await extractTagsWithGemini(artist.name, artist.bio)

      if (!validateCareerStage(tags)) {
        console.warn(`  ⚠ No valid career stage in tags for ${artist.name}: ${JSON.stringify(tags)}`)
        results.missingCareerStage++
      }

      await prisma.artist.update({
        where: { id: artist.id },
        data: {
          comprehend_tags: tags,
          comprehend_ran: new Date(),
        }
      })

      console.log(`  ✓ ${artist.name}: ${JSON.stringify(tags)}`)
      results.success++

      // Respect Gemini free tier rate limit (15 RPM)
      await new Promise(r => setTimeout(r, 4100))
    } catch (err) {
      console.error(`  ✗ ${artist.name}: ${err.message}`)
      results.failed++
    }
  }

  console.log(`\nDone. Success: ${results.success}, Failed: ${results.failed}, Missing career stage: ${results.missingCareerStage}`)

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
