// Import necessary dependencies from React and D3
import { useContext, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

// Import LigandContext to access ligand data
import LigandContext from "../context/LigandContext";

// Define margin and bucket constants for the histogram
const MARGIN = { top: 30, right: 30, bottom: 40, left: 50 };
const BUCKET_NUMBER = 70;
const BUCKET_PADDING = 1;

// Define the width and height of the SVG container
const width = 800;
const height = 400;

// Histogram component
export default function Histogram() {
  // Access ligand data from the context
  const { ligand } = useContext(LigandContext);

  // Extract standard values from ligand data and transform them
  var data = ligand.map((obj) => obj.standard_value);
  data = ligand.map((obj) => -Math.log10(obj.standard_value * 10e-9));

  // Create a reference to the SVG element
  const svgRef = useRef(null);

  // Calculate the width and height of the chart area within the SVG
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  // Create X scale based on the data
  const xScale = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    return d3
      .scaleLinear()
      .domain([min, max])
      .range([0, boundsWidth]);
  }, [data, boundsWidth]);

  // Create a bucket generator for the histogram
  const bucketGenerator = useMemo(() => {
    return d3
      .bin()
      .value((d) => d)
      .domain(xScale.domain())
      .thresholds(xScale.ticks(BUCKET_NUMBER));
  }, [xScale]);

  // Generate histogram buckets based on the data
  const buckets = useMemo(() => bucketGenerator(data), [bucketGenerator, data]);

  // Create Y scale based on the histogram buckets
  const yScale = useMemo(() => {
    const max = d3.max(buckets, (bucket) => bucket.length);
    return d3.scaleLinear().range([boundsHeight, 0]).domain([0, max || 0]).nice();
  }, [buckets, boundsHeight]);

  // Effect to update the chart when the scales or data change
  useEffect(() => {
    // Select the SVG element
    const svgElement = d3.select(svgRef.current);

    // Remove existing elements within the SVG
    svgElement.selectAll("*").remove();

    // Create X-axis and position it
    const xAxisGenerator = d3.axisBottom(xScale);
    svgElement
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${height - MARGIN.bottom})`)
      .call(xAxisGenerator);

    // Create Y-axis and position it
    const yAxisGenerator = d3.axisLeft(yScale);
    svgElement
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)
      .call(yAxisGenerator);

    // Create bars for the histogram
    const bars = svgElement
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)
      .selectAll("rect")
      .data(buckets)
      .join("rect")
      .attr("x", (d) => xScale(d.x0) + BUCKET_PADDING / 2)
      .attr("width", (d) => Math.max(0, xScale(d.x1) - xScale(d.x0) - BUCKET_PADDING))
      .attr("y", (d) => yScale(d.length))
      .attr("height", (d) => boundsHeight - yScale(d.length))
      .attr("fill", "#69b3a2");
  }, [xScale, yScale, buckets]);

  // Render the component with the SVG container
  return (
    <div className="container">
      <svg width={width} height={height} ref={svgRef}>
        <g ref={svgRef}>
          {/* Bars will be created within the useEffect */}
        </g>
      </svg>
    </div>
  );
}
