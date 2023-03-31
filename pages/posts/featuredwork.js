import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";

export default function FeaturedWork() {
  return (
    <>
      <Layout>
        <Head>
          <title>Featured Work</title>
          <link rel="icon" href="/public/favicon.ico" />
          <meta
            name="description"
            content="Hear about this exquisite work for sale at ZXY"
          />
          <meta
            property="og:image"
            content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          />
        </Head>

        <div className="flex-container">
          <h2>
            <img src="/chiara2.jpeg" alt="Flyer" className="container1" />
            Abraxas by Chiara No
            {/* We are pleased to offer this work at a discount price as part of our
        work of the month program aiming to connect collectors to artists. */}
          </h2>

          {/* Image here */}

          <h3>
            Mother of pearl drips from the tip of the phallus as a serpent
            clapper hangs below the soundbow of the bell.
            {/* Price reflects price of work. Price and details of shipping to be
        arranged with artist. */}
            <br /> <br />
            To hear the sound of the bell ringing click{" "}
            <a href="https://vimeo.com/660146105">here</a>.
          </h3>
          <h2>Inquire for pricing and shipping details</h2>

          <Link href="/">Back to home</Link>
        </div>
      </Layout>
    </>
  );
}
