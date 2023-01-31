import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
export const getAllUsers = async () => {
  const allUsers = await prisma.mytable.findMany();
  return allUsers;
};
