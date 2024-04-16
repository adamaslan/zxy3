import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import SplashRandom from "../../components/SplashRandom";
// import SplashScreen from "../../components/SplashScreen";
export default function About() {
  return (
    <>
      <Layout>
        <Heads          <title>About ZXY</title>
          <link rel="icon" href="/public/favicon.ico" />
          <meta
            name="description"
            content="A technology focused Art Gallery located in Bushwick, Brooklyn"
          />

          <meta
            property="og:image"
            content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          />
        </Head>
        <h1>About Zxy Gallery</h1>
        <br />{" "}
        <h2>
          {" "}
          We are always looking for artists, especially artists that can show
          work outdoors. Contact us on instagram{" "}
          <a href="https://www.instagram.com/zxygallery/">@zxygallery </a>.{" "}
        </h2>
        <h2>
          {" "}
          ZXY Gallery looks to bring together artists from a variety of
          backgrounds. Inclusivity and safety are primary concerns. We are proud
          to show work from the QTBIPOC, immigrants, women, and other
          communities that have not traditionally had the same opportunities in
          the art world.
          <br />
          <br /> We also believe that much of the "progress" that has been made
          is a band-aid on a gaping wound in the art world. We take pride in our ability to create a safe space for dialogue. As
          such, we have had many artists discuss their work at the gallery in a salon-type environment.
        </h2>{" "}
        <br />
        <h2>
          We value an inclusivity of the term “art” that embraces experiments with technology,
          digital art, 3D animation, and AI. While physical
          art will always have a place, we are excited about the accessibility
          to the art world that these emerging technologies bring.
        </h2>
        <br />
        <br />
        <h2>
          How it was built: <br /> This website is built with Nextjs, React,
          CSS, HTML. It is super fast via its integration with Vercel, which
          also allows for testing before deployment. It runs via github.
        </h2>
        <h2>
          <Link href="/">Back to home</Link>
        </h2>
      </Layout>
      <SplashRandom />
    </>
  );
}
