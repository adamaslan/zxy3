import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import { getAllUsers } from "../../components/Search2";
import { useState } from "react";

export default function PastShows({ results }) {
  // console.log(results);
  // console.log({ results });
  const [state, setState] = useState({ search: "", searchResults: [] });
  const handleChange = (e) => {
    const { name, value } = e.target;

    setState((s) => ({ ...s, [name]: value }));
  };
  const handleSearch = async (e) => {
    e.preventDefault();
    const result = await fetch(`/api/search?searchDB=${state.search}`)
      .then((j) => j.json())
      .then((r) => r);
    setState((s) => ({ ...s, searchResults: result }));
  };
  return (
    <>
      <Layout>
        <Head>
          <title>An Archive of Past Events at ZXY Gallery</title>
          <link rel="icon" href="/public/favicon.ico" />
          <link
            rel="apple-touch-icon"
            href="https://res.cloudinary.com/adamaslan/image/upload/c_thumb,w_200,g_face/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          ></link>
          <meta name="description" content="Hear about all our past events." />
          <meta
            property="og:image"
            content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          />
        </Head>
        <article>
          <p> Inquire about specific shows prior to 2021 </p>
          <p>
            Find more on our instagram{" "}
            <a href="https://www.instagram.com/zxygallery/">
              <a>@zxygallery </a>
            </a>{" "}
          </p>
          <h2>
            <Link href="/">Back to home</Link>
          </h2>

          <input onChange={handleChange} name="search" />
          <button type={"button"} onClick={handleSearch}>
            Search
          </button>
          {state.searchResults.map((result) => (
            <li>
              <span>{result.date} </span>
              {result.time}
            </li>
          ))}
          {/* <h2>Search our database for artists:</h2> */}
          {/* const searchResults = []; */}
        </article>
      </Layout>
    </>
  );
}

export const getServerSideProps = async () => {
  const results = await getAllUsers();
  const cleanResult = results.map((date) => ({
    ...date,
    counter_value: "abc",
    increment: "abc",
  }));
  return { props: { results: JSON.parse(JSON.stringify(cleanResult)) } };
};
