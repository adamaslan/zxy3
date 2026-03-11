const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── SOURCE: internationalartmagazine.com landing page scrape ─────────────────

const ARTISTS = [
  "Magnus Maxine Flowers", "Jilaine Jones", "Barbara Ess", "Annie Hayes",
  "Paul Latislaw", "Rhys Ziemba", "Ada Friedman", "Ozan Ünal",
  "Pentti Monkkonen", "Beatriz Chachamovits", "Mira Lehr", "Lauren Shapiro",
  "Manuela Riestra", "Portia Zvavahera", "Irja Boden", "Jamie Martinez",
  "Carla Maldonado", "Jovanni Luna", "Peggy Ahwesh", "Dean Cercone",
  "Jay Milder", "Sarah Sze", "Lena Marquise", "Carlito Dalceggio",
  "Aurora Halal", "Sam Rolfes", "Justin Shoulder", "Andrew Erdos",
  "Yasue Maetake", "Haas Brothers", "Elisa Pritzker", "Nyuegen E. Smith",
  "Lina Puerta", "Mimi Oritsky", "Laura Kimmel", "Jordan Piantedosi",
  "Go Pushpops", "Byron Kim", "Kip Davis", "Julie Speidel",
  "Travis Boyer", "Raymond Pettibon", "Indira Cesarine", "Emma Stern",
  "Wendy Klemperer", "Emilie Stark-Menneg", "Rebecca Ness", "Tim McCool",
  "Marco Santini"
]

const GALLERIES = [
  { name: "King's Leap", type: "commercial" },
  { name: "15 Orient", type: "commercial" },
  { name: "Magenta Plains", type: "commercial" },
  { name: "Diana New York", type: "commercial" },
  { name: "KIPNZ", type: "commercial" },
  { name: "Jenny's", type: "commercial" },
  { name: "Bakehouse Art Complex", type: "non-profit" },
  { name: "ZXY Gallery", type: "commercial" },
  { name: "Luhring Augustine", type: "commercial" },
  { name: "Clearing", type: "commercial" },
  { name: "Underdonk", type: "commercial" },
  { name: "Paradice Palase", type: "commercial" },
  { name: "Tiger Strikes Asteroid", type: "commercial" },
  { name: "Mery Gates", type: "commercial" },
  { name: "David Zwirner", type: "commercial" },
  { name: "Amos Eno Gallery", type: "commercial" },
  { name: "SoMad", type: "commercial" },
  { name: "Microscope Gallery", type: "commercial" },
  { name: "Galerie Manque", type: "commercial" },
  { name: "Provincetown Art Association & Museum", type: "non-profit" },
  { name: "Tanya Bondakar Gallery", type: "commercial" },
  { name: "550 Gallery", type: "commercial" },
  { name: "Radiator Gallery", type: "commercial" },
  { name: "Signal Gallery", type: "commercial" },
  { name: "The Border", type: "commercial" },
  { name: "Alexandra Arts / ART511MAG", type: "commercial" },
  { name: "Robert Miller Gallery", type: "commercial" },
  { name: "James Cohan", type: "commercial" },
  { name: "Alt Esc", type: "commercial" },
  { name: "Winston Wächter Fine Art", type: "commercial" },
  { name: "Jorge Andrew Gallery", type: "commercial" },
  { name: "International Gallery", type: "commercial" },
  { name: "Carpenter's Workshop Gallery", type: "commercial" },
  { name: "Galeria Agustina Ferreyra", type: "commercial" },
  { name: "Mana Contemporary", type: "non-profit" },
  { name: "Honey Ramka", type: "commercial" },
]

const MUSEUMS = [
  { name: "Museum of Modern Art", slug: "moma", city: "New York", country: "USA", type: "museum" },
  { name: "The Metropolitan Museum of Art", slug: "the-met", city: "New York", country: "USA", type: "museum" },
  { name: "Jewish Museum in South Beach", slug: "jewish-museum-south-beach", city: "Miami Beach", country: "USA", type: "museum" },
  { name: "The Bass", slug: "the-bass", city: "Miami Beach", country: "USA", type: "museum" },
  { name: "The New Museum", slug: "the-new-museum", city: "New York", country: "USA", type: "museum" },
  { name: "Pioneer Works", slug: "pioneer-works", city: "New York", country: "USA", type: "non-profit" },
  { name: "Pratt Institute", slug: "pratt-institute", city: "New York", country: "USA", type: "institution" },
  { name: "The Strzeminski Academy of Fine Arts", slug: "strzeminski-academy", city: "Łódź", country: "Poland", type: "institution" },
  { name: "The Armory Show", slug: "the-armory-show", city: "New York", country: "USA", type: "art_fair" },
  { name: "Art Basel", slug: "art-basel", city: "Basel", country: "Switzerland", type: "art_fair" },
  { name: "Untitled Art Fair", slug: "untitled-art-fair", city: "Miami Beach", country: "USA", type: "art_fair" },
  { name: "Frieze LA", slug: "frieze-la", city: "Los Angeles", country: "USA", type: "art_fair" },
  { name: "Spring/Break Art Show", slug: "spring-break-art-show", city: "New York", country: "USA", type: "art_fair" },
  { name: "Satellite Art Show", slug: "satellite-art-show", city: "Miami Beach", country: "USA", type: "art_fair" },
  { name: "Felix Art Show", slug: "felix-art-show", city: "Los Angeles", country: "USA", type: "art_fair" },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ─── SEED ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database from internationalartmagazine.com scrape...\n')

  // ── 1. Seed Artists ──────────────────────────────────────────────────────────
  console.log(`Seeding ${ARTISTS.length} artists...`)
  for (const name of ARTISTS) {
    await prisma.artist.upsert({
      where: { slug: toSlug(name) },
      update: {},
      create: {
        name,
        slug: toSlug(name),
        active: true,
        bio_generated: false,
        comprehend_tags: [],
        metrics: {
          create: {
            search_hits: 0,
            profile_views: 0,
          }
        }
      },
    })
  }
  console.log(`✅ ${ARTISTS.length} artists seeded\n`)

  // ── 2. Seed Galleries ────────────────────────────────────────────────────────
  console.log(`Seeding ${GALLERIES.length} galleries...`)
  for (const g of GALLERIES) {
    await prisma.gallery.upsert({
      where: { name: g.name },
      update: {},
      create: {
        name: g.name,
        slug: toSlug(g.name),
        type: g.type,
      },
    })
  }
  console.log(`✅ ${GALLERIES.length} galleries seeded\n`)

  // ── 3. Seed Museums & Institutions ──────────────────────────────────────────
  console.log(`Seeding ${MUSEUMS.length} museums & institutions...`)
  for (const m of MUSEUMS) {
    await prisma.gallery.upsert({
      where: { name: m.name },
      update: {},
      create: {
        name: m.name,
        slug: m.slug,
        city: m.city,
        country: m.country,
        type: m.type,
      },
    })
  }
  console.log(`✅ ${MUSEUMS.length} museums & institutions seeded\n`)

  const artistCount = await prisma.artist.count()
  const galleryCount = await prisma.gallery.count()
  console.log(`🎉 Done! DB now has ${artistCount} artists and ${galleryCount} galleries/institutions.`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
