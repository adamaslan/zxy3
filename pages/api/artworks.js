// pages/api/artworks.js
import { prisma } from "../../prisma/globalprisma";

export default async function handler(req, res) {
  try {
    const artworks = await prisma.mytable.findMany({
      select: {
        id: true,
        artist: true,
        medium1: true,
        medium2: true,
        price_range: true
      }
    });
    
    // Convert BigInt to string for JSON serialization
    const serializedArtworks = artworks.map(artwork => ({
      ...artwork,
      id: artwork.id.toString()
    }));
    
    res.status(200).json(serializedArtworks);
  } catch (error) {
    console.error("Error fetching artworks:", error);
    res.status(500).json({ error: "Failed to fetch artworks" });
  }
}

// This utility function can be used elsewhere in your application
export async function getAllArtworks() {
  try {
    const artworks = await prisma.mytable.findMany();
    
    // Convert BigInt to string for JSON serialization
    return artworks.map(artwork => ({
      ...artwork,
      id: artwork.id.toString()
    }));
  } catch (error) {
    console.error("Error fetching artworks:", error);
    throw error;
  }
}