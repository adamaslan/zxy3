/**
 * Backward Compatibility Helper
 * Maps new schema (artworks + artists) to old API contract (mytable)
 *
 * This allows existing API routes to continue working unchanged
 * while using the new underlying schema
 */

/**
 * Get all artworks in old format
 * Used by: GET /api/artworks
 */
async function getAllArtworksCompat(prisma) {
  const artworks = await prisma.artwork.findMany({
    include: {
      artist: {
        select: { name: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Map to old schema format
  return artworks.map(artwork => ({
    id: artwork.id.toString(),
    artist: artwork.artist.name,
    medium1: artwork.medium1,
    medium2: artwork.medium2,
    price_range: artwork.priceRange
  }));
}

/**
 * Search artworks by term (artist or medium, case-insensitive)
 * Used by: GET /api/search?searchDB=<term>
 */
async function searchArtworksCompat(prisma, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    // Empty search = return all
    return getAllArtworksCompat(prisma);
  }

  const term = searchTerm.trim();

  const artworks = await prisma.artwork.findMany({
    where: {
      OR: [
        {
          artist: {
            name: {
              contains: term,
              mode: 'insensitive'
            }
          }
        },
        {
          medium1: {
            contains: term,
            mode: 'insensitive'
          }
        },
        {
          medium2: {
            contains: term,
            mode: 'insensitive'
          }
        }
      ]
    },
    include: {
      artist: {
        select: { name: true }
      }
    }
  });

  // Map to old schema format
  return artworks.map(artwork => ({
    id: artwork.id.toString(),
    artist: artwork.artist.name,
    medium1: artwork.medium1,
    medium2: artwork.medium2,
    price_range: artwork.priceRange
  }));
}

/**
 * Get artwork by ID in old format
 */
async function getArtworkByIdCompat(prisma, artworkId) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: BigInt(artworkId) },
    include: {
      artist: {
        select: { name: true, id: true }
      }
    }
  });

  if (!artwork) {
    return null;
  }

  return {
    id: artwork.id.toString(),
    artist: artwork.artist.name,
    medium1: artwork.medium1,
    medium2: artwork.medium2,
    price_range: artwork.priceRange
  };
}

/**
 * Migrate old mytable record to new schema
 * Used internally during data migration
 */
async function migrateOldRecord(prisma, mytableRecord) {
  const { artist, medium1, medium2, price_range, id } = mytableRecord;

  // Find or create artist
  let artistRecord = await prisma.artist.findFirst({
    where: {
      name: {
        equals: artist,
        mode: 'insensitive'
      }
    }
  });

  if (!artistRecord) {
    artistRecord = await prisma.artist.create({
      data: {
        name: artist
      }
    });
  }

  // Create artwork record
  return await prisma.artwork.create({
    data: {
      id,
      artistId: artistRecord.id,
      medium1: medium1 || 'Unknown',
      medium2,
      priceRange: price_range
    }
  });
}

module.exports = {
  getAllArtworksCompat,
  searchArtworksCompat,
  getArtworkByIdCompat,
  migrateOldRecord
};
