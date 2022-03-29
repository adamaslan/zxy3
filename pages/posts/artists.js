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
        <h1>Artists</h1>
        <h2>We are very excited about these artists and curators:</h2>
        <p>Liz Ainslie </p>
<p> Chiara No</p>
<p>Andrew Zarou </p>
        <p>Nazli Efe</p>
        <p>Lillian Shtereva</p>
        <p>Eva Mueller</p>
<p>Laura Tifflin </p>
  <p> Nicholas Cueva </p>
        <p> Carrie Rudd </p>
        <p> Michael Eckblad </p>
        <p>Will Ava Wang</p>
        <p>Julia Duarte </p>

        <h3>Curators</h3>
        <p>Audra Lambert</p>
        <p>A. Timur Kilicaslan</p>
        <h2>
          <Link href="/">
            <a>Back to home</a>
          </Link>
        </h2>
      </Layout>
    </>
  );
}
