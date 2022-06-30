// Idea create actual component lol this is an app right now!!!
//So I NEED to take out the app like things and put them into indexjs
//and export the component like all the rest of components

// import * as React from "react";
// const Searchy = () => {
//   const stories = [
//     {
//       artist: "Chiara No",
//       url: "http://www.chiara-no.com/",
//       medium: "Sculpture",
//       medium2: "Installation",
//       objectID: 0,
//     },
//     {
//       artist: "Andrew Zarou",

//       medium: "Painting",
//       medium2: "Drawing",
//       objectID: 1,
//     },
//     {
//       artist: "Nazli Efe",

//       medium: "Sculpture ",
//       medium2: "Installation",
//       instagram: "@nazliefee",
//       objectID: 2,
//     },
//     {
//       artist: "Liz Ainslie",
//       url: "http://www.lizainslie.com/",
//       medium: "",
//       medium2: "",
//       objectID: 3,
//     },
//     {
//       artist: "Michael Eckblad",
//       url: "http://michaeleckblad.com/",
//       medium: "Sculpture",
//       medium2: "Installation",
//       objectID: 4,
//     },
//   ];

//   const [searchTerm, setSearchTerm] = React.useState("React");

//   const handleSearch = (event) => {
//     setSearchTerm(event.target.value);
//   };

//   const searchedStories = stories.filter((story) =>
//     story.title.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div>
//       <h1>My Hacker Stories</h1>

//       <Search search={searchTerm} onSearch={handleSearch} />

//       <hr />

//       <List list={searchedStories} />
//     </div>
//   );
// };

// const Search = ({ search, onSearch }) => (
//   <div>
//     <label htmlFor="search">Search: </label>
//     <input id="search" type="text" value={search} onChange={onSearch} />
//   </div>
// );

// const List = ({ list }) => (
//   <ul>
//     {list.map((item) => (
//       <Item key={item.objectID} item={item} />
//     ))}
//   </ul>
// );

// const Item = ({ item }) => (
//   <li>
//     <span>
//       <button type="button" onClick={() => onRemoveItem(item)}>
//         Dismiss
//       </button>
//     </span>
//   </li>
// );

// export default Searchy;
