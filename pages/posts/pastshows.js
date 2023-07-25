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
          <h1>Past Shows - 2023</h1>
          <h2>Invoking Pizza</h2>
          <p> Artists present disparate works deconstructing pizza creating a dialogue a posteriori of inherited tropes
            exposing latent meaning with in pizza and with
            out as pizza is shown to connect with a larger individual and societal sense of identity</p>

          <h1>Past Shows - 2022</h1>

          <h2>Holiday Market</h2>
          <p> ZXY Presents a variety of works perfect as Holiday Gifts</p>


          <h2>Meaning in Fragility</h2>
          <p>
            ZXY Gallery is pleased to announce its latest group exhibition,
            “Meaning in Fragility”, featuring work by Stefanie Guerrero,
            Lesdavag, and Manuela Riestra. These works speak to the fragility of
            existence for those embracing contemporary values in a society
            fueled by problematic interests. While this fragility is ubiquitous
            for all with similar senses of meaning, it is particularly
            challenging for artists devoted to upholding a sense of self that
            challenges archaic modes and also must put in the time requisite to
            survive as an artist. A tenuous grasp on things becomes meaningful
            as an artist balances concerns for their own physical and mental
            health with the needs of a committed art practice. Stefanie Guerrero
            explores fragility through the uncertainty and chance for error she
            embraces in her work. Manuela Riestra uses art to deconstruct many
            important aspects of the human experience. Lesdavag deals with the
            rejection of personal history by dancing a baile folklorico laden
            with meaning and the vulnerable solitude of diverging from a
            prevailing culture.{" "}
          </p>

          <h2>Natural Ephemera</h2>
          <p>
            These works evocative of earthen material will be presented on the
            heavenly confines of the ZXY Gallery roof. Highlighting displacement
            this exibition speaks to identity question often faced by
            individuals seeking a place of refuge.{" "}
          </p>
          <h2>Sea Friends</h2>
          <p>
            {" "}
            With so much connected to the sea, one wonders why we imagine that
            we can seemingly do the type of things to it that we would never
            want to see done to land that is close to where we live. The amount
            of toxic chemicals that are poured into the ocean is astonishing.
            Evoking the beauty and importance of this mysterious and clandestine
            gem, the artists of “Sea Friends bring together a strong vision of
            what goes into all the aspects of the sea.
          </p>
          <p> Inquire about specific shows prior to 2021 </p>
          <h2>
            Search for works of Sculpture, Painting, Photography and more:
          </h2>
          <input onChange={handleChange} name="search" />
          <button className="funbutton" type={"button"} onClick={handleSearch}>
            Search
          </button>
          <p>
            Find more on our instagram{" "}
            <a href="https://www.instagram.com/zxygallery/">
              <a>@zxygallery </a>
            </a>{" "}
          </p>
          <h2>
            <Link href="/">Back to home</Link>
          </h2>

          {state.searchResults.map((result) => (
            <li>
              <span>{result.artist} </span>
              {result.medium1}
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
  const cleanResult = results.map((artist) => ({ ...artist, id: "abc" }));
  return { props: { results: JSON.parse(JSON.stringify(cleanResult)) } };
};
