
<script lang="ts">
  /*
  import { onMount, onDestroy } from "svelte";
  import * as d3 from "d3";

  // Dummy data for the histogram
  let data = [0, 0, 0, 12, 23, 45, 56, 34, 90, 21, 76, 34, 53, 24, 78, 12, 61, 370, 19, 55, 61, 79, 50];
  const binNumber = 100;

  // Set up a reactive store for width and height
  let width: number, height: number;

  // x and y axis labels
  export let xLabel = 'X Axis Label';
  export let yLabel = 'Y Axis Label';

  // Function to update the size
  const updateSize = () => {
    const container = document.getElementById("histogram-container");
    width = container.offsetWidth;
    height = container.offsetHeight;
    renderChart();
  };

  let svg;

  // Create the histogram whenever the size or data changes
  const renderChart = () => {
    // Clear previous chart if it exists
    d3.select(svg).selectAll("*").remove();

    // Define margins for the chart
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };

    // Set up the SVG element
    const svgElement = d3
      .select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create the x scale
    const x = d3.scaleLinear().domain([0, d3.max(data)]).range([0, width - margin.left - margin.right]);

    // Create bins for the histogram
    const bins = d3.bin().domain(x.domain()).thresholds(binNumber)(data);

    // Create the y scale based on bin frequencies
    const y = d3.scaleLinear().domain([0, d3.max(bins, (d) => d.length)]).range([height - margin.top - margin.bottom, 0]);

    // Create bars for the histogram
    svgElement
      .selectAll(".bar")
      .data(bins)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.x0))
      .attr("y", (d) => y(d.length))
      .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
      .attr("height", (d) => height - margin.top - margin.bottom - y(d.length))
      .attr("fill", "steelblue");

    // Add x-axis
    svgElement
      .append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x));

    // Add y-axis
    svgElement.append("g").call(d3.axisLeft(y));

    // Add x-axis label
    svgElement
      .append("text")
      .attr("transform", `translate(${(width - margin.left - margin.right) / 2}, ${height - margin.top - margin.bottom + 40})`)
      .style("text-anchor", "middle")
      .text(xLabel);

    // Add y-axis label
    svgElement
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -(height - margin.top - margin.bottom) / 2)
      .style("text-anchor", "middle")
      .text(yLabel);
  };

  // Listen to window resize events
  onMount(() => {
    window.addEventListener("resize", updateSize);
    updateSize(); // Initial size update

    // Clean up when component is destroyed
    onDestroy(() => {
      window.removeEventListener("resize", updateSize);
    });
  });

  //<svg bind:this={svg}></svg>
  */
</script>

<style>
  #histogram-container {
    width: 100%; /* Make container width flexible */
    height: 500px; /* Set a fixed height for the container, or make it dynamic */
  }
</style>

<div id="histogram-container">
</div>
