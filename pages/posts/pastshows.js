import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import Searchy2 from "../../components/Search2";

export default function PastShows() {
  return (
    <>
      <Layout>
        <Head>
          <title>An Archive of Past Events at ZXY Gallery</title>
          <link rel="icon" href="/public/favicon.ico" />
          <link
            rel="apple-touch-icon"
            href="https://res.cloudinary.com/adamaslan/image/upload/c_thumb,w_200,g_face/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          ></link>
          <meta name="description" content="Hear about all our past events." />
          <meta
            property="og:image"
            content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          />
        </Head>
        <article>
          <h1>Past Shows - 2021</h1>

          <h2>Earth in the Heavens </h2>
          <p>
            These works evocative of earthen material will be presented on the
            heavenly confines of the ZXY Gallery roof. Highlighting displacement
            this exibition speaks to identity question often faced by
            individuals seeking a place of refuge.{" "}
          </p>
          <h2>"Process / Progress</h2>
          <p>
            {" "}
            A Group exhibition showcasing artists that display unique processes
            behind their work. On display is not just the completed works, but
            also artifacts of the process. Artists showing include Renana
            Nueman, Emily MacCloud, Bianca Boragi, Derek Des Islets, Bill
            Pierce, Mofaana Morojele, Robert Balun
          </p>

          <p> Inquire about specific shows prior to 2021 </p>

          <p>
            Find more on our instagram{" "}
            <a href="https://www.instagram.com/zxygallery/">
              <a>@zxygallery </a>
            </a>{" "}
          </p>
          <Searchy2 />

          <h2>
            <Link href="/">Back to home</Link>
          </h2>
        </article>
      </Layout>
    </>
  );
}
