// // prisma/seed.ts

// import { PrismaClient } from '@prisma/client'

// const prisma = new PrismaClient()

// async function main() {

//     await prisma.mytable.createMany({ data: mytable});

// const mytable = [
//   {
//     artist: `Katy Watson`,
//     medium1: 'Food Art',
// },
// ];

// main()
//   .catch(e => {
//     console.error(e)
//     process.exit(1)
//   })
//   .finally(async () => {
//     await prisma.$disconnect()
//   })
