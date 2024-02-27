import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const GroupedBarChart = ({ mae, r2 }) => {
  // Check if both mae and r2 are provided and have the same length
  if (!mae || !r2 || mae.length !== r2.length) {
    return <div>Error: Both mae and r2 arrays are required and must have the same length.</div>;
  }

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const svgRef = useRef();
  const parentRef = useRef(null);
  
  const getSvgContainerSize = () => {
    const newWidth = parentRef.current.clientWidth;
    const newHeight = parentRef.current.clientHeight;
    setDimensions({ width: newWidth, height: newHeight });
  };

  useEffect(() => {
    window.addEventListener("resize", getSvgContainerSize);
    return () => window.removeEventListener("resize", getSvgContainerSize);
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 && dimensions.height === 0){
      getSvgContainerSize();
    }
    const margin = { top: 10, right: 30, bottom: 10, left: 70 },
    width = dimensions.width - margin.left - margin.right,
    height = dimensions.height - margin.top - margin.bottom;

    const svgElement = d3.select(svgRef.current).select("svg");
    d3.select(svgRef.current).selectAll('*').remove();
    if (svgElement.empty()) {
      // append the svg object to the body of the page
      const svg = d3.select(svgRef.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Calculate folds based on the length of the arrays
      const folds = Array.from({ length: mae.length }, (_, i) => `Fold ${i + 1}`);

      // List of subgroups
      const subgroups = ['MAE', 'R²'];

      // Add X axis
      const x = d3.scaleBand()
        .domain(folds)
        .range([0, width])
        .padding([0.2]);
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSize(0));

      // Add Y axis
      const y = d3.scaleLinear()
        .domain([0, d3.max([...mae, ...r2])])
        .range([height, 0]);
      svg.append("g")
        .call(d3.axisLeft(y));

      // Another scale for subgroup position
      const xSubgroup = d3.scaleBand()
        .domain(subgroups)
        .range([0, x.bandwidth()])
        .padding([0.05]);

      // color palette = one color per subgroup
      const color = d3.scaleOrdinal()
        .domain(subgroups)
        .range(['#e41a1c', '#377eb8']);

      // Show the bars
      svg.append("g")
        .selectAll("g")
        .data(folds)
        .join("g")
        .attr("transform", d => `translate(${x(d)}, 0)`)
        .selectAll("rect")
        .data(function (d, i) {
          return subgroups.map(key => ({ key, value: (key === 'MAE' ? mae[i] : r2[i]) }));
        })
        .join("rect")
        .attr("x", d => xSubgroup(d.key))
        .attr("y", d => y(d.value))
        .attr("width", xSubgroup.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key));

      // Add legend
      const legend = svg.append("g")
        .attr("transform", `translate(${width - 30}, 0)`);

      legend.selectAll("rect")
        .data(subgroups)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 20)
        .attr("height", 10)
        .attr("fill", d => color(d));

      legend.selectAll("text")
        .data(subgroups)
        .enter()
        .append("text")
        .attr("x", 30)
        .attr("y", (d, i) => i * 20 + 8)
        .text(d => d)
        .style("font-size", "12px")
        .style("fill", "black");
    }
  }, [mae, r2, dimensions]); // dependencies include mae and r2 arrays

  return (
    <div className='container' ref={parentRef}>
      <div id="my_dataviz" ref={svgRef}>
        {/* SVG will be rendered here */}
      </div>
    </div>
  );
};

export default GroupedBarChart;
