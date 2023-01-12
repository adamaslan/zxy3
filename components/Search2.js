import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
export const getAllUsers = async () => {
  const allUsers = await prisma.mytable.findMany();
  return allUsers;
};
// function Searchy2({ results }) {
//   return (
//     <div>
//       <h1>Search Results</h1>
//       <ul>
//         {results.map((result) => (
// //           <li>{result.artist}</li>
// <li>{result.medium1}</li>
// <li>{result.medium2}</li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export const getServerSideProps = async (context) => {
//   const prisma = new PrismaClient();
//   const { q } = context.query;
//   const results = await prisma.mytable.findMany({
//     where: {
//       OR: [{ medium1: { contains: q } }, { medium2: { contains: q } }],
//     },
//   });
//   return { props: { results } };
// };

// export default Searchy2;

// const { PrismaClient } = require("@prisma/client");

// const Searchy2 = async () => {
//   // async function main() {
//   console.log(allUsers);
//   return allUsers;
// };
// export default Searchy2;
// }

// // main()
// //   .then(async () => {
// //     await prisma.$disconnect();
// //   })
// //   .catch(async (e) => {
// //     console.error(e);
// //     await prisma.$disconnect();
// //     process.exit(1);
//   });

// // import { useState, useEffect } from "react";
// // import { PrismaClient } from "@prisma/client";
// // import { useRouter } from "next/router";

// // const Searchy2 = () => {
// //   const router = useRouter();
// //   const [results, setResults] = useState([]);
// //   const [query, setQuery] = useState(router.query.artist);

// //   const handleSearch = (event) => {
// //     setQuery(event.target.value);
// //   };

// //   useEffect(() => {
// //     async function fetchResults() {
// //       const prisma = new PrismaClient();
// //       const res = await prisma.mytable.findMany({
// //         where: {
// //           OR: [
// //             { artist: { contains: query } },
// //             { medium1: { contains: query } },
// //           ],
// //         },
// //       });
// //       setResults(res);
// //     }
// //     fetchResults();
// //   }, [query]);

// //   return (
// //     <div>
// //       <input type="text" value={query} onChange={handleSearch} />
// //       {results.map((result) => (
// //         <div key={result.id}>{result.name}</div>
// //       ))}
// //     </div>
// //   );
// // };

// // export default Searchy2;

// // // // Idea create actual component lol this is an app right now!!!
// // // //So I NEED to take out the app like things and put them into indexjs
// // // //and export the component like all the rest of components

// // // import * as React from "react";

// // // export async function getStaticProps() {
// // //   const prisma = new PrismaClient();
// // //   const stories = await prisma.mytable.findMany();

// // //   return {
// // //     props: { stories },
// // //   };
// // // }

// // // const Searchy2 = ({ stories }) => {
// // //   // const stories = [
// // //   //   {
// // //   //     artist: "Chiara No",
// // //   //     url: "http://www.chiara-no.com/",
// // //   //     medium: " Sculpture",
// // //   //     medium2: " Installation",
// // //   //     objectID: 0,
// // //   //   },
// // //   //   {
// // //   //     artist: "Andrew Zarou",

// // //   //     medium: " Painting",
// // //   //     medium2: " Drawing",
// // //   //     objectID: 1,
// // //   //   },
// // //   //   {
// // //   //     artist: "Nazli Efe",

// // //   //     medium: " Sculpture ",
// // //   //     medium2: " Installation",
// // //   //     instagram: "@nazliefee",
// // //   //     objectID: 2,
// // //   //   },
// // //   //   {
// // //   //     artist: "Liz Ainslie",
// // //   //     url: "http://www.lizainslie.com/",
// // //   //     medium: " Painting",
// // //   //     medium2: " Drawing",
// // //   //     objectID: 3,
// // //   //   },
// // //   //   {
// // //   //     artist: "Michael Eckblad",
// // //   //     url: "http://michaeleckblad.com/",
// // //   //     medium: " Sculpture",
// // //   //     medium2: " Installation",
// // //   //     objectID: 4,
// // //   //   },
// // //   // ];

// // //   const [searchTerm, setSearchTerm] = React.useState("");

// // //   const handleSearch = (event) => {
// // //     setSearchTerm(event.target.value);
// // //   };

// // //   const searchedStories = stories.filter((story) =>
// // //     story.artist.toLowerCase().includes(searchTerm.toLowerCase())
// // //   );

// // //   return (
// // //     <div>
// // //       <Search search={searchTerm} onSearch={handleSearch} />

// // //       <hr />

// // //       <List list={searchedStories} />
// // //     </div>
// // //   );
// // // };

// // // const Search = ({ search, onSearch }) => (
// // //   <div>
// // //     <label htmlFor="search">Search Artist: </label>
// // //     <input id="search" type="text" value={search} onChange={onSearch} />
// // //   </div>
// // // );

// // // const List = ({ list }) => (
// // //   <ul>
// // //     {list.map((item) => (
// // //       <Item key={item.objectID} item={item} />
// // //     ))}
// // //   </ul>
// // // );
// // // // const { data, error } = useSWR("/api/posts", fetcher);
// // // // if (error) return <div>An error occured.</div>;
// // // // if (!data) return <div>Loading ...</div>;

// // // // return (
// // // //   <ul>
// // // //     {data.posts.map((post) => (
// // // //       <li key={post.id}>{post.title}</li>
// // // //     ))}
// // // //   </ul>
// // // // );

// // // // export default ({posts}) =>
// // // //   <ul>
// // // //    {posts.map(post => (
// // // //      <li key={post.id}>{post.title}</li>
// // // //     ))}
// // // //   </ul>
// // // // );

// // // const Item = ({ item }) => (
// // //   <li>
// // //     <span>
// // //       <a href={item.url}>{item.artist}</a>
// // //     </span>
// // //     <span>{item.medium}</span>
// // //     <span>{item.medium2}</span>
// // //   </li>
// // // );

// // // export default Searchy2;
