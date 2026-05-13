import { prisma } from "../prisma/globalprisma";

export const getAllUsers = async () => {
  try {
    const allUsers = await prisma.mytable.findMany();
    return allUsers;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
  // Remove the $disconnect() call from here since it can cause issues
  // Prisma handles connections automatically
};