import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import { Data } from "../../components/Data";
import { BarChart } from "../../components/BarChart";
import BarGraph2 from "../../components/BarGraph2";

import { useState } from "react";
export default function FeaturedWork() {
  const data = {
    labels: ["Red", "Orange", "Blue"],
    // datasets is an array of objects where each object represents a set of data to display corresponding to the labels above. for brevity, we'll keep it at one object
    datasets: [
      {
        label: "Popularity of colours",
        data: [55, 23, 96],
        // you can set indiviual colors for each bar
        backgroundColor: [
          "rgba(255, 255, 255, 0.6)",
          "rgba(255, 255, 255, 0.6)",
          "rgba(255, 255, 255, 0.6)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const [chartData, setChartData] = useState({
    labels: Data.map((data) => data.year),
    datasets: [
      {
        label: "Users Gained ",
        data: Data.map((data) => data.userGain),
        backgroundColor: [
          "rgba(75,192,192,1)",
          "#ecf0f1",
          "#50AF95",
          "#f3ba2f",
          "#2a71d0",
        ],
        borderColor: "black",
        borderWidth: 2,
      },
    ],
  });
  return (
    <>
      <Layout>
        <Head>
          <title>Med3 Work</title>
          <link rel="icon" href="/public/favicon.ico" />
          <meta
            name="description"
            content="Hear about this exquisite work for sale at ZXY"
          />
          <meta
            property="og:image"
            content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
          />
        </Head>

        <h1>med Work</h1>
        <BarGraph2 />
        <BarChart chartData={chartData} />

        <h2>a chart</h2>

        <Link href="/">Back to home</Link>
      </Layout>
    </>
  );
}
