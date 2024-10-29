import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import styles from "../../styles/layout.module.css";
import { useEffect, useRef } from "react";

export default function CurrentShows() {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, []);

  return (
    <Layout>
      <Head>
        <title>Current Show "Mayoween" at ZXY Gallery in Bushwick</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Hear about our current exhibit at ZXY Gallery in Bushwick, Brooklyn for the last 8 years"
        />
        <meta
          property="og:image"
          content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
        />
      </Head>
      <article>
        <div className={styles.gridcontainer4}>
          <div className={styles.gridcontainer5}>
            <video
              ref={videoRef}
              alt="art show"
              className={styles.photo}
              src="/mayo1.MOV"
              autoPlay
              loop
              muted
              playsInline
            />

            <h1>ZXY Gallery presents "Mayoween"</h1>
            <p>A group exhibition and culinary journey</p>
            
            <p>Work by:</p>
            <ul>
              <li>Carolyn Colsant @jkbutseriously</li>
              <li>Gunner Dongieux @gunlagoon</li>
              <li>Karla Zurita @karlakarlakarlazurita</li>
              <li>Julio Williams @julio.cesar.williams</li>
            </ul>

            <p>Featuring: Kewpie Mayo</p>

            <h2>
              Find more on our Instagram{" "}
              <a href="https://www.instagram.com/zxygallery/" target="_blank" rel="noopener noreferrer">
                @zxygallery
              </a><br />
              <Link href="/">Home</Link>
            </h2>
            
          </div>
        </div>
      </article>
    </Layout>
  );
}
