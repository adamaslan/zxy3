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
        <h1>Current Show</h1>
        <h2>"Imagined Sequences: Physiognomy Amongst"</h2>

        <Image src="/seqflyer.jpg" alt="Flyer" width={500} height={700} />

        <p>
          Imagined sequences: Physiognomy amongst.. Here you are with me now.
          You smile boldly. Then breathe deeply and exclaim a joyous “ahh”.
          Others are present too though some of their visages are dimly lit or
          even distorted. I’m not sure where we are. My place. Your place.
          Somewhere that doesn’t exactly exist. The imagined image perpetuates
          itself in unending succession, taking on objects, releasing others,
          some painfully, some with nostalgia, and others with a beautiful
          perfection. Why not? These sequences are yours only. Give them the
          ideal if you so choose. The ephemera can be from your face as it
          showed your nervous system from a seemingly more naive and open
          glance. Maybe it’s a friend’s laugh at you being characteristically
          aloof to conventional pretense. It is yours. Breathe it in and let it
          run through you wildly.
        </p>
        <p>
          Announcing “Imagined Sequences,” a new series of exhibitions at ZXY
          Gallery. The first exhibition deals with memory, nostalgia, ephemera,
          delirium, and inchoate scenes.
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
      </Layout>
    </>
  );
}
