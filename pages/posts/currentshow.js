import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import styles from "../../styles/layout.module.css";


export default function CurrentShows() {
  return (
    <>
      <Layout>
        <Head>
          <title>
            Current Show "Adjacencies of the Organic" at ZXY Gallery in Bushwick
          </title>
          <link rel="icon" href="/public/favicon.ico" />
          <meta
            name="description"
            content="Hear about all our current exhibit at ZXY Gallery in Bushwick, Brooklyn for the last 8 years"
          />
          <meta
            property="og:image"
            content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          />
        </Head>
        <article>
          {/*<div className="flex-container">*/}
              <div className={styles.gridcontainer4}>
                  {/*<div className={headerStyles.description}>*/}
                  {/*    On the Love of Raki and Turkish Food <br />*/}
                  {/*</div>*/}
                  <div className={styles.gridcontainer5}>
                      <img
                alt="art show"
                className={styles.photo}
                src="/organic-flyer.jpeg"
              />


            <p>ZXY Gallery presents "Adjacencies of the Organic"</p>
            <p>

              The word ORGANIC carries a certain note its tone’s effect moves poly-directionally ever onward with little seeming resistance. Yet…the biologic’s TONE could either be synonymous or seemingly static. The profundity of its diction infinite but it’s effect muted unless put in another context. A backup singer at best or award winning supporting acting roles for life. The biologic feels left BEHIND.
<br /> <br />
              "Adjacencies of the Organic" seeks to re-emphasize the biologic in a practice of saying yes. Yes to aliveness. Yes to MATERIALS that come directly from something being alive or any OBJECT that provides a resource that aides an organism.

              The works in this show will range from installation to bio art to ceramic sculpture to edible art.
            </p>

            <h2>
              <p>
                Find more on our instagram{" "}
                <a href="https://www.instagram.com/zxygallery/">
                  <a>@zxygallery </a>
                </a>{" "}
              </p>
<br />
              <Link href="/">Back to home</Link>
            </h2>
                  </div>
          </div>

        </article>
      </Layout>
    </>
  );
}
