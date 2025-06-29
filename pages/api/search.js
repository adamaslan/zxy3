// Fix the import - should be the prisma instance, not from Search2
import { prisma } from "../../prisma/globalprisma";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { searchDB } = req.query;

  try {
    let artworks;
    
    if (!searchDB || searchDB.trim() === '') {
      // If no search term, return all artworks
      artworks = await prisma.mytable.findMany({
        select: {
          id: true,
          artist: true,
          medium1: true,
          medium2: true
        }
      });
    } else {
      // Search for artworks matching the search term
      artworks = await prisma.mytable.findMany({
        where: {
          OR: [
            {
              artist: {
                contains: searchDB,
                mode: 'insensitive' // Case-insensitive search
              }
            },
            {
              medium1: {
                contains: searchDB,
                mode: 'insensitive'
              }
            },
            {
              medium2: {
                contains: searchDB,
                mode: 'insensitive'
              }
            }
          ]
        },
        select: {
          id: true,
          artist: true,
          medium1: true,
          medium2: true
        }
      });
    }

    res.status(200).json(artworks);
  } catch (error) {
    console.error("Error searching artworks:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
}