import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import Image from "next/image";

export default function CurrentShows() {
  return (
    <>
      <Layout>
        <Head>
          <title>Current Show "Sea Friends" at ZXY Gallery in Bushwick</title>
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
          <h1>Current Show</h1>
          <h2>"Sea Friends"</h2>
          <div class="flex-container">
            <div>
              <Image
                alt="art show"
                width={1072}
                height={872}
                src="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/Choral-show3_a4mibl.jpg"
              />
            </div>
          </div>
          <p>ZXY Gallery presents Sea Friends</p>
          <p>
            "Sea Friends" is a group show focused on the ocean. It brings
            together a range of art that share both similar aesethetic qualities
            and delve into a range of qualities associated with the sea. The
            topics in this show range from protecting the strange and beautiful
            coral to enjoying life on a planet that offers the beauty of the
            sea.
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
