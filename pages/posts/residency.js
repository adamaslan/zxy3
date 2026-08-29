import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import styles from "../../styles/layout.module.css";

export default function Residency() {
  return (
    <Layout>
      <Head>
        <title>Artist Residency at ZXY Gallery in Bushwick</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="The ZXY Gallery Artist Residency — studio space, curatorial support, and a technology-focused program for emerging artists in Bushwick, Brooklyn"
        />
        <meta
          property="og:image"
          content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
        />
      </Head>
      <article>
        <div className={styles.gridcontainer4}>
          <div className={styles.gridcontainer5}>
            <h2>ZXY Gallery presents:</h2>
            <h1>Artist Residency</h1>

            <p>
              The ZXY Gallery Artist Residency gives emerging artists dedicated
              time and space to make new work, with an emphasis on experiments in
              technology, digital art, 3D animation, and AI alongside traditional
              media. Residents work in dialogue with the gallery&apos;s curatorial
              program and its salon-style environment of artist discussions and
              performance.
            </p>

            <h3>What residents receive:</h3>
            <ul>
              <li>Studio and project space at the gallery in Bushwick, Brooklyn</li>
              <li>Curatorial and technical support, including data and technology consulting for artist careers</li>
              <li>A culminating exhibition or performance as part of the ZXY program</li>
              <li>Access to the gallery&apos;s outdoor exhibition opportunities</li>
              <li>Potential help with lodging depending on availability &mdash; ask us for details</li>
            </ul>

            <h3>Who we support:</h3>
            <p>
              We are proud to prioritize work from QTBIPOC, immigrant, women, and
              other communities that have not traditionally had the same
              opportunities in the art world. Inclusivity and safety are primary
              concerns of the residency.
            </p>

            <h3>How to apply:</h3>
            <p>
              Applications are reviewed on a rolling basis. DM us on Instagram{" "}
              <a
                href="https://www.instagram.com/zxygallery/"
                target="_blank"
                rel="noopener noreferrer"
              >
                @zxygallery
              </a>{" "}
              to find out about more specifics &mdash; including how we may be able
              to help with lodging &mdash; or email{" "}
              <a href="mailto:contact@zxygallery.com">contact@zxygallery.com</a>{" "}
              with a short introduction, a link to your work, and what you would
              like to make during the residency.
            </p>

            <br />
            <h3>
              <Link href="/posts/about">Back to About</Link>
              {" · "}
              <Link href="/">Home</Link>
            </h3>
          </div>
        </div>
      </article>
    </Layout>
  );
}
