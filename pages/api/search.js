import { prisma } from "../../components/Search2";
export default async (req, res) => {
  const { searchDB } = req.query;
  console.log(searchDB);
  try {
    const results = await prisma.mytable.findMany({
      where: {
        OR: [
          { artist: { contains: searchDB } },
          { medium1: { contains: searchDB } },
        ],
      },
    });
    const cleanResult = results.map((artist) => ({ ...artist, id: "abc" }));
    res.status(200).json(cleanResult);
  } catch (err) {
    console.log(err);
    res.status(403).json({ err: "Error occured while adding a new artist." });
  }
};
// export default async function handle(req, res) {
//   const posts = await prisma.post.findMany();
//   res.json(artist);
//   console.log.json(artist);
// }

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
