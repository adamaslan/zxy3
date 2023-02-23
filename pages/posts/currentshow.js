import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import Image from "next/image";

export default function CurrentShows() {
  return (
    <>
      <Layout>
        <Head>
          <title>
            Current Show "Holiday Market" at ZXY Gallery in Bushwick
          </title>
          <link rel="icon" href="/public/favicon.ico" />
          <meta
            name="description"
            content="Hear about all our current exhibit Sea Friends at ZXY Gallery in Bushwick, Brooklyn"
          />
          <meta
            property="og:image"
            content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          />
        </Head>
        <article>
          <div className="flex-container">
            <div className="container1">
              <img
                alt="art show"
                className="container1"
                src="https://res.cloudinary.com/adamaslan/image/upload/v1675883567/ZXY%20/holiday-market1_wo9voo.jpg"
              />
            </div>

            <p>ZXY Gallery presents "Holiday Market"</p>
            <p>
              "Holiday Market" is a group show focused on bringing together
              artists that want to sell their work in a market-esque
              environment. We hope to have future markets. Contact us if you
              would like to participate on instagram.
            </p>

            <h2>
              <p>
                Find more on our instagram{" "}
                <a href="https://www.instagram.com/zxygallery/">
                  <a>@zxygallery </a>
                </a>{" "}
              </p>

              <Link href="/">Back to home</Link>
            </h2>
          </div>
        </article>
      </Layout>
    </>
  );
}
