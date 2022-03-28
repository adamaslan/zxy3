import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import Image from "next/image";

export default function PastShows() {
  return (
    <>
      <Layout>
        <Head>
          <title>ZXY</title>
        </Head>
        <article>
        <h1>Current Show</h1>
        <h2>"*Mei- (1) + *Mei- (2)"</h2>

 <Image src="/mei1.jpg" alt="Flyer" width={1110} height={810} />

    <p>
    ZXY Gallery is proud to announce, *Mei- (1) + *Mei- (2), a group exhibition with Liz Ainslie, Andrew Zarou, Chiara, and Nazlie Efe.

The show is an exploration of these two Proto-Indo-European roots that have evidence of their existence in Sanskirt, Latin, Greek, and old English.
*mei- (1) is the Proto-Indo-European root meaning "to change, go, move,"
*mei- (2) is Proto-Indo-European root meaning "small."
</p><p>
These divergent meanings allow for a multitude of analogies with the artists shown in this exhibition. On focus is a beauty created through the softness of material and color.

Expressed as painting and sculpture, the works explore an aesthetic that carries a sense of humility in color via a multitude of themes behind the individual works.
        </p>

        <h2>
          <p>
            Find more on our instagram{" "}
            <a href="https://www.instagram.com/zxygallery/">
              <a>@zxygallery </a>
            </a>{" "}
          </p>
          <Link href="/">
            <a>Back to home</a>
          </Link>
        </h2>
        </article>
      </Layout>
    </>
  );
}
