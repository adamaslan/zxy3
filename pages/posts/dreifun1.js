import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import SplashScreen from "../../components/SplashScreen";

export default function DreiFun1() {
  return (
    <>
      <Layout>
        <Head>
          <title>DreiFun1 </title>
          <link rel="icon" href="/public/favicon.ico" />
          <meta
            name="description"
            content="Hear about all our current exhibit Sea Friends at ZXY Gallery in Bushwick, Brooklyn"
          />
          <meta
            property="og:image"
            content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          />
        </Head>
        <article>
          <div className="flex-container">
            <div className="container1">DreiFun1</div>

            <SplashScreen />

            <h2>
              <p>
                Find more on our instagram{" "}
                <a href="https://www.instagram.com/zxygallery/">
                  <a>@zxygallery </a>
                </a>{" "}
              </p>

              <Link href="/">Back to home</Link>
            </h2>
          </div>
        </article>
      </Layout>
    </>
  );
}
