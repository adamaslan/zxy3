// Idea create actual component lol this is an app right now!!!
//So I NEED to take out the app like things and put them into indexjs
//and export the component like all the rest of components

import * as React from "react";

export async function getStaticProps() {
  const prisma = new PrismaClient();
  const posts = await prisma.post.findMany();

  return {
    props: { posts },
  };
}

const Searchy2 = (props) => {
  const stories = [
    {
      artist: "Chiara No",
      url: "http://www.chiara-no.com/",
      medium: " Sculpture",
      medium2: " Installation",
      objectID: 0,
    },
    {
      artist: "Andrew Zarou",

      medium: " Painting",
      medium2: " Drawing",
      objectID: 1,
    },
    {
      artist: "Nazli Efe",

      medium: " Sculpture ",
      medium2: " Installation",
      instagram: "@nazliefee",
      objectID: 2,
    },
    {
      artist: "Liz Ainslie",
      url: "http://www.lizainslie.com/",
      medium: " Painting",
      medium2: " Drawing",
      objectID: 3,
    },
    {
      artist: "Michael Eckblad",
      url: "http://michaeleckblad.com/",
      medium: " Sculpture",
      medium2: " Installation",
      objectID: 4,
    },
  ];

  const [searchTerm, setSearchTerm] = React.useState("");

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const searchedStories = stories.filter((story) =>
    story.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Search search={searchTerm} onSearch={handleSearch} />

      <hr />

      <List list={searchedStories} />
    </div>
  );
};

const Search = ({ search, onSearch }) => (
  <div>
    <label htmlFor="search">Search Artist: </label>
    <input id="search" type="text" value={search} onChange={onSearch} />
  </div>
);

const List = ({ list }) => (
  <ul>
    {list.map((item) => (
      <Item key={item.objectID} item={item} />
    ))}
  </ul>
);
// const { data, error } = useSWR("/api/posts", fetcher);
// if (error) return <div>An error occured.</div>;
// if (!data) return <div>Loading ...</div>;

// return (
//   <ul>
//     {data.posts.map((post) => (
//       <li key={post.id}>{post.title}</li>
//     ))}
//   </ul>
// );

// export default ({posts}) =>
//   <ul>
//    {posts.map(post => (
//      <li key={post.id}>{post.title}</li>
//     ))}
//   </ul>
// );

const Item = ({ item }) => (
  <li>
    <span>
      <a href={item.url}>{item.artist}</a>
    </span>
    <span>{item.medium}</span>
    <span>{item.medium2}</span>
  </li>
);

export default Searchy2;
