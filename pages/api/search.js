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

// import { PrismaClient } from "@prisma/client";
// import { useRouter } from "next/router";

// const Searchy2 = () => {
//   const router = useRouter();
//   const [results, setResults] = useState([]);
//   const [query, setQuery] = useState(router.query.artist);

//   const handleSearch = (event) => {
//     setQuery(event.target.value);
//   };

//   useEffect(() => {
//     async function fetchResults() {
//       const prisma = new PrismaClient();
//       const res = await prisma.mytable.findMany({
//         where: {
//           OR: [
//             { artist: { contains: query } },
//             { medium1: { contains: query } },
//           ],
//         },
//       });
//       setResults(res);
//     }
//     fetchResults();
//   }, [query]);

//   return (
//     <div>
//       <input type="text" value={query} onChange={handleSearch} />
//       {results.map((result) => (
//         <div key={result.id}>{result.name}</div>
//       ))}
//     </div>
//   );
// };

// export default Searchy2;

// // export async function getStaticProps() {
// //   const prisma = new PrismaClient()
// //   const creatives = await prisma.mytable.findMany()
// //   return {
// //     props: {
// //       creatives,
// //     },
// //   }
// // }

// // function ProductsPage({ products }) {
// //   return (
// //     <div>
// //       {products.map((product) => (
// //         <div key={product.id}>{product.name}</div>
// //       ))}
// //     </div>
// //   )
// // }

// // // import { useRouter } from "next/router";
// // // import { PrismaClient } from "@prisma/client";

// // // const prisma = new PrismaClient();

// // // app.get("/api/search", async (req, res) => {
// // //   const results = await prisma.mytable.findMany({
// // //     where: {
// // //       OR: [
// // //         { artist: { contains: req.query.q } },
// // //         { medium1: { contains: req.query.q } },
// // //       ],
// // //     },
// // //   });
// // //   res.json(results);
// // // });

// // // function SearchResults() {
// // //   const router = useRouter();
// // //   const [results, setResults] = useState([]);

// // //   useEffect(() => {
// // //     async function fetchResults() {
// // //       const res = await fetch(`/api/search?q=${router.query.q}`);
// // //       const data = await res.json();
// // //       setResults(data);
// // //     }
// // //     fetchResults();
// // //   }, [router.query.q]);

// // //   return (
// // //     <div>
// // //       {results.map((result) => (
// // //         <div key={result.id}>{result.name}</div>
// // //       ))}
// // //     </div>
// // //   );
// // // }

// // // // export default async function handle(req, res) {
// // // //   const posts = await prisma.post.findMany();
// // // //   res.json(artist);
// // // //   console.log.json(artist);
// // // // }

// // // // export async function getStaticProps() {
// // // //   // Get all artists in the "artist" db
// // // //   const allArists = await prisma.mytable.findMany();

// // // //   return {
// // // //     props: allArtists,
// // // //   };
// // // // }

// // //
