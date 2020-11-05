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
        <h2>We've been at it for a while</h2>

        <h2>
          <Link href="/">
            <a>Back to home</a>
          </Link>
        </h2>
      </Layout>
    </>
  );
}
