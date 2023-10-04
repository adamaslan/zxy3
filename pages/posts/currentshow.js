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
            Current Show "Atonement ||" at ZXY Gallery in Bushwick
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
                src="/atone.jpeg"
              />


            <p>ZXY Gallery presents "Atonement ||"</p>
            <p>

            The exhibition seeks to atone via bringing in works that are challenging for the gallery to show for various reasons. </p>

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
