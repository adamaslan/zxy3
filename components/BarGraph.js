// import {
//   Chart as ChartJS,
//   defaults
// } from 'chart.js';
// import {
//   Chart
// } from 'react-chartjs-2';

// const data = {
//   labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
//   datasets: [
//     {
//       label: 'Frequency',
//       backgroundColor: 'rgba(255,99,132,0.2)',
//       borderColor: 'rgba(255,99,132,1)',
//       borderWidth: 1,
//       hoverBackgroundColor: 'rgba(255,99,132,0.4)',
//       hoverBorderColor: 'rgba(255,99,132,1)',
//       data: [4, 8, 15, 16, 23, 42, 30]
//     }
//   ]
// };

// const options = {
//   scales: {
//     yAxes: [{
//       ticks: {
//         beginAtZero: true
//       }
//     }]
//   }
// };

// const BarGraph = () => {
//     return (
//       <Bar
//         data={data}
//         options={options}
//       />
//     );
// }
// export default BarGraph;

// // import Image from "next/image";
// // import * as d3 from "d3";
// // import { useEffect } from "react";

// // const BarGraph = () => {
// //   const data = [
// //     { day: "Monday", frequency: 4 },
// //     { day: "Tuesday", frequency: 8 },
// //     { day: "Wednesday", frequency: 15 },
// //     { day: "Thursday", frequency: 16 },
// //     { day: "Friday", frequency: 23 },
// //     { day: "Saturday", frequency: 42 },
// //     { day: "Sunday", frequency: 30 },
// //   ];
// //   const yScale = d3
// //     .scaleLinear()
// //     .domain([0, d3.max(data, (d) => d.frequency)])
// //     .range([400, 0]);
// //   useEffect(() => {
// //     const xScale = d3
// //       .scaleBand()
// //       .domain(data.map((d) => d.day))
// //       .range([0, 600])
// //       .padding(0.1);

// //     const yScale = d3
// //       .scaleLinear()
// //       .domain([0, d3.max(data, (d) => d.frequency)])
// //       .range([400, 0]);

// //     const svg1 = d3
// //       .select("#bar-chart")
// //       .append("g")
// //       .attr("transform", "translate(0,400)")
// //       .call(d3.axisBottom(xScale));

// //     const svg2 = d3
// //       .select("svg")
// //       .append("g")
// //       .attr("transform", "translate(0,0)")
// //       .call(d3.axisLeft(yScale));

// //     const svg = d3
// //       .select("svg  ")
// //       .append("g")
// //       .attr("transform", "translate(0,0)")
// //       .call(d3.axisLeft(yScale))
// //       .append("text")
// //       .attr("transform", "rotate(-90)")
// //       .attr("y", 6)
// //       .attr("dy", "0.71em")
// //       .attr("text-anchor", "end")
// //       .text("Frequency");
// //   }, []);

// //   return <div id="bar-chart"></div>;
// // };

// // export default BarGraph;
