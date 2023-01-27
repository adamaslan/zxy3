import Image from "next/image";
import * as d3 from "d3";
import { useEffect } from "react";

const BarGraph = () => {
  useEffect(() => {
    const data = [4, 8, 15, 16, 17, 23, 42];
    const svg = d3
      .select("#bar-chart")
      .append("svg")
      .attr("width", 600)
      .attr("height", 400);
    svg
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d, i) => i * 70)
      .attr("y", (d, i) => 400 - 10 * d)
      .attr("width", 65)
      .attr("height", (d, i) => d * 10)
      .attr("fill", "green");
  }, []);

  return <div id="bar-chart"></div>;
};

export default BarGraph;
