import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define the function to get all users
export const getAllUsers = async () => {
  try {
    // Fetch all users from the "mytable" table
    const allUsers = await prisma.mytable.findMany();
    return allUsers;
  } catch (error) {
    // Handle any potential errors
    console.error("Error fetching users:", error);
    throw error; // Re-throw the error so it can be caught elsewhere
  } finally {
    // Ensure the Prisma client disconnects to free up resources
    await prisma.$disconnect();
  }
};
