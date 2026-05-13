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
              src="/zxy-april.MOV"
              autoPlay
              loop
              muted
              playsInline
            />

            <h2>ZXY Gallery presents:</h2>
            <h2>Paula De Martino</h2>
            <h2>Rosalie Smith</h2>
            <p>These multi-displinary artists are currently showing at ZXY Gallery</p>
            
            <p>Stay tuned for more information on the closing event in Bushwick</p>
<br />
<br />
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
