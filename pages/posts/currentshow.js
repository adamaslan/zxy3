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
        <h2>"Invoking the Amphibian"</h2>

        <Image src="/seqflyer.jpg" alt="Flyer" width={500} height={700} />

        <p>
         To build upon the shaky foundations of the current epoch, we must be hybrids. Survival depends on both physical and mental security, which can be at risk at any time. Amphibians provide a model of adaptability. Invoking the amphibian seems like a safe bet for survival. We must both adapt to the present conditions given to us and also evolve for a future uniquely to  provide ourselves the skills to allow us to flourish in a new paradigm. Flash floods ravage NYC and forest fires burn through Turkey. The air may not be safe one day and water the next. Amphibious life could become the norm. While lessons on survival can be learned from amphibians, French sociologist and anthropologist Bruno Latour provides the concept of hybrids that focuses on entities existing both in a natural and social realm. Attempts to divorce one from the other, paradoxically just reinforces their connection. In this sense, to survive, we all must be like frogs. 

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
