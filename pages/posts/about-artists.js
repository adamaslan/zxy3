import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import styles from "../../styles/layout.module.css";
import { useEffect, useRef } from "react";
import ArtworkTable from "../../components/db-magic";

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
        <title>Artist DB</title>
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
       
            <h2>ZXY Gallery Artist DB</h2>
           
         
<br />
<br />
<ArtworkTable />
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
