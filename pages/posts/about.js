import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";

export default function About() {
  return (
    <>
      <Layout>
        <Head>
          <title>ZXY</title>
        </Head>
        <h1>About Zxy Gallery</h1>
        <h2>Its a real thang dog we live it we do it we bout it.</h2>

        <h2>
          <Link href="/">
            <a>Back to home</a>
          </Link>
        </h2>
      </Layout>
    </>
  );
}
