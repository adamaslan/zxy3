import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import Layout from "../../components/layout";
import styles from "../../styles/layout.module.css";

export default function CurrentShows() {
  return (
    <Layout>
      <Head>
        <title>Current Show "Horizonality" at ZXY Gallery in Bushwick</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="ZXY Gallery spring exhibition Horizonality — exploring soil horizons as an exhibition metaphor, Bushwick Brooklyn"
        />
        <meta
          property="og:image"
          content="/horizon1.jpg"
        />
      </Head>
      <article>
        <div className={styles.gridcontainer4}>
          <div className={styles.gridcontainer5}>
            <img
              alt="Horizonality at ZXY Gallery"
              className={styles.photo}
              src="/horizon1.jpg"
              style={{ width: "100%", maxWidth: "700px", height: "auto" }}
            />

            <h2>ZXY Gallery presents:</h2>
            <h1>Horizonality</h1>

            <p>
              Horizonality refers to the way soil naturally organizes itself into distinct
              horizontal layers over time. Just as soil has horizons and each unique plot of
              land its own specific horizonality, so too does an art exhibition. The ZXY Gallery
              spring exhibition &ldquo;Horizonality&rdquo; seeks to explore the various works in the
              exhibition as akin to soil in a continuous state of mixing new minerals, organisms,
              spring, and rain water.
            </p>

            <h3>Excited to show work by:</h3>
            <ul>
              <li><a href="https://www.instagram.com/rugratz4lyfe/" target="_blank" rel="noopener noreferrer">@rugratz4lyfe</a> — Josie Girard</li>
              <li><a href="https://www.instagram.com/theophilusgaffney/" target="_blank" rel="noopener noreferrer">@theophilusgaffney</a> — Theo Gaffney</li>
              <li><a href="https://www.instagram.com/rosesilb/" target="_blank" rel="noopener noreferrer">@rosesilb</a> — Rose Silberman-Gorn</li>
              <li><a href="https://www.instagram.com/mallorywork/" target="_blank" rel="noopener noreferrer">@mallorywork</a> — Mallory Concetta Smith</li>
              <li><a href="https://www.instagram.com/aliceaherbert/" target="_blank" rel="noopener noreferrer">@aliceaherbert</a> — Alice Herbert</li>
              <li><a href="https://www.instagram.com/creepykelli/" target="_blank" rel="noopener noreferrer">@creepykelli</a> — Kelli Mcguire</li>
              <li><a href="https://www.instagram.com/doitforthething/" target="_blank" rel="noopener noreferrer">@doitforthething</a> — Yue Yuan</li>
              <li><a href="https://www.instagram.com/lucindagracielaceramics/" target="_blank" rel="noopener noreferrer">@lucindagracielaceramics</a> — Lucinda Graciela</li>
              <li><a href="https://www.instagram.com/shellemi1/" target="_blank" rel="noopener noreferrer">@shellemi1</a> — Michelle-B-Lin</li>
              <li><a href="https://www.instagram.com/miagrasso__/" target="_blank" rel="noopener noreferrer">@miagrasso__</a> — Mia Grasso</li>
              <li><a href="https://www.instagram.com/goldfinchbolton.studio/" target="_blank" rel="noopener noreferrer">@goldfinchbolton.studio</a> — Goldfinch Bolton</li>
            </ul>

            <h3>Performances and readings by:</h3>
            <ul>
              <li><a href="https://www.instagram.com/hero.magnus/" target="_blank" rel="noopener noreferrer">@hero.magnus</a> — Hero Magnus</li>
              <li><a href="https://www.instagram.com/nycpony/" target="_blank" rel="noopener noreferrer">@nycpony</a> — Adam Aslan</li>
            </ul>

            <br />
            <h3>
              Find more on our Instagram{" "}
              <a href="https://www.instagram.com/zxygallery/" target="_blank" rel="noopener noreferrer">
                @zxygallery
              </a>
            </h3>
            <Link href="/">Home</Link>
          </div>
        </div>
      </article>
    </Layout>
  );
}
