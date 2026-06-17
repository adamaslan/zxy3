import { prisma } from "../prisma/globalprisma";

export const getAllArtworks = async () => {
  try {
    const allArtworks = await prisma.mytable.findMany();
    return allArtworks;
  } catch (error) {
    console.error("Error fetching artworks:", error);
    throw error;
  }
  // Remove the $disconnect() call from here since it can cause issues
  // Prisma handles connections automatically
};