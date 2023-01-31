import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// export default async function handle(req, res) {
//   const posts = await prisma.post.findMany();
//   res.json(artist);
//   console.log.json(artist);
// }

export async function getStaticProps() {
  // Get all artists in the "artist" db
  const allArists = await prisma.mytable.findMany();

  return {
    props: allArtists,
  };
}

// export default async (req, res) => {
//   const data = req.body;
//   try {
//     const result = await prisma.artist.create({
//       data: {
//         ...data,
//       },
//     });
//     res.status(200).json(result);
//   } catch (err) {
//     console.log(err);
//     res.status(403).json({ err: "Error occured while adding a new artist." });
//   }
// };
