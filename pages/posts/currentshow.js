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
            Current Show "Trad Medium" at ZXY Gallery in Bushwick
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
                src="/tradmedium.jpeg"
              />


            <p>ZXY Gallery presents "Trad Medium"</p>
            <p>

            announcing “Trad Medium” - ah yes…the trad medium…the trad use of material…the trad dichotomy of subject and object…the trad decision to figure or abstract…shall we try to escape it? no…not today…we will embrace it…study it…move forth…appreciating…the works…like a successful trad gallery ought to, should do…ZXY Gal at your trad service sir… </p>
            <p>
work by:<br />
Lucius Anhello @lucius_anhello <br />
Mariel Rowling Montes @maaaaarmz  <br />
Georgia Hourdas @georgia_hourdas <br />
Liz Ainslie @liz.ainslie <br />
Sanie Bokhari @saniebokhari <br />
Gunner Dongieux @gunlagoon <br />
Farrell Mason-Brown @ffawo <br />
Noel de Lesseps @noeldelesseps <br />
Mary Sellers @srellesyram <br />
Eliot Lambert @eliot_lambert <br />
curated by @cosmicveggie </p> 

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
