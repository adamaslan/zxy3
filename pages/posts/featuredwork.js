import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";

import Image from "next/image";

export default function FeaturedWork() {
  return (
    <>
      <Layout>
        <Head>
          <title>Featured Work</title>
        </Head>

        <h1>Featured Work</h1>
        <h2>
          <Image src="/chiara2.jpeg" alt="Flyer" width={810} height={1110} />
          Abraxas by Chiara No
          {/* We are pleased to offer this work at a discount price as part of our
          work of the month program aiming to connect collectors to artists. */}
        </h2>

        {/* Image here */}

        <h3>
        Mother of pearl drips from the tip of the phallus as a serpent clapper hangs below the soundbow of the bell. 
          {/* Price reflects price of work. Price and details of shipping to be
          arranged with artist. */}<br>
          To here the sound click  <a href="https://vimeo.com/660146105">here</a>.
        </h3>
        <h2>Inquire for pricing and shipping details</h2>

        {/* <h1>Artists</h1>
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
        <h2> */}
        <Link href="/">
          <a>Back to home</a>
        </Link>
      </Layout>
    </>
  );
}
