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
        <h1>About Zxy Gallery</h1><br /> <h2> We are always looking for artists of various sorts! Contact us today! </h2>  <h2> ZXY Gallery looks to bring together artists from a variety of backgrounds. Inclusivity and safety are primary concerns. We are proud to show work from the QTBIPOC, immigrants, women, and other communities that have not traditionally had the same opportunities in the art world.<br /> We also believe that much of the "progress" that has been made is a band-aid on a gaping wound. One thing that sets us apart from other galleries is our ability to create a safe space for dialogue. As such, we have had many artists discuss their work at the gallery.</h2><br /><br /> 
        <h2>How it was built: <br /> This website is built with Nextjs, React, CSS, HTML. It is super fast via its integration with vercel, which also allows for testing before deployment. It runs via github.
</h2>

        <h2>
          <Link href="/">
            <a>Back to home</a>
          </Link>
        </h2>
      </Layout>
    </>
  );
}
