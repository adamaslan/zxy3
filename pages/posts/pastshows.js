import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";

export default function PastShows() {
  return (
    <>
      <Layout>
        <Head>
          <title>ZXY</title>
        </Head>
        <h1>Past Shows</h1>

        <h2>"Process / Progress</h2>
        <p>
          {" "}
          A Group exhibition showcasing artists that display unique processes
          behind their work. On display is not just the completed works, but
          also artifacts of the process. Artists showing include Renana Nueman,
          Emily MacCloud, Bianca Boragi, Derek Des Islets, Bill Pierce, Mofaana
          Morojele, Robert Balun
        </p>

        <h2>
          <Link href="/">
            <a>Back to home</a>
          </Link>
        </h2>
      </Layout>
    </>
  );
}
