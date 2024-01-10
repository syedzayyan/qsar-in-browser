import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import D3ColorLegend from './D3ColorLegend';
import { Tooltip } from './ToolTip'


const Scatterplot = ({ data, colorProperty, hoverProp, xAxisTitle, yAxisTitle }) => {
  const svgRef = useRef();
  const [details, setDetails] = useState(null);

  const handleMouseOver = (event, d) => {
    const [x, y] = d3.pointer(event);
    setDetails({
      xPos: x,
      yPos: y,
      name: hoverProp[data.indexOf(d)],
    });
  };

  const handleMouseEnd = () => {
    setDetails(null);
  };

  useEffect(() => {
    // set the dimensions and margins of the graph
    const margin = { top: 10, right: 30, bottom: 30, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Find the minimum and maximum values in your data for both x and y
    const xExtent = d3.extent(data, d => d.x);
    const yExtent = d3.extent(data, d => d.y);

    // Append the SVG object to the body of the page
    const svg = d3.select(svgRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);


    // Set the zoom and Pan features: how much you can zoom, on which part, and what to do when there is a zoom
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20]) // This controls how much you can unzoom (x0.5) and zoom (x20)
      .extent([[0, 0], [width, height]])
      .on('zoom', updateChart);

    // This adds an invisible rect on top of the chart area. This rect can recover pointer events: necessary to understand when the user zoom
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .call(zoom);

    // now the user can zoom, and it will trigger the function called updateChart

    // A function that updates the chart when the user zooms and thus new boundaries are available
    function updateChart(event) {
      // recover the new scale
      const newX = event.transform.rescaleX(x);
      const newY = event.transform.rescaleY(y);

      // update axes with these new boundaries
      xAxis.call(d3.axisBottom(newX));
      yAxis.call(d3.axisLeft(newY));

      // update circle position
      scatter
        .selectAll('circle')
        .attr('cx', (d) => newX(d.x))
        .attr('cy', (d) => newY(d.y));
    }

    // Add X axis
    const x = d3.scaleLinear()
      .domain([d3.min(data, d => d.x), d3.max(data, d => d.x)])
      .range([0, width]);
    const xAxis = svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([d3.min(data, d => d.y), d3.max(data, d => d.y)])
      .range([height, 0]);
    const yAxis = svg.append('g')
      .call(d3.axisLeft(y));



    // Add a clipPath: everything out of this area won't be drawn.
    const clip = svg.append('defs').append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('x', 0)
      .attr('y', 0);

    // Create the scatter variable: where both the circles and the brush take place
    const scatter = svg.append('g')
      .attr('clip-path', 'url(#clip)');



    const colorScale = d3.scaleSequential().domain([1, 10]).interpolator(d3.interpolateSinebow);

    // Add circles
    scatter
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.x))
      .attr('cy', (d) => y(d.y))
      .attr('r', 8)
      .style('fill', (_, i) => colorScale(colorProperty[i]))
      .style('opacity', 0.5)
      .on('mouseenter', handleMouseOver)
      .on('mouseleave', handleMouseEnd);


    svg.append('text')
      .attr('transform', `translate(${width / 2},${height + margin.top + 20})`)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color)')
      .text(xAxisTitle);

    // Add Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color)')
      .text(yAxisTitle);
  }, [data]);

  return (
    <div className='container' style={{ position: 'relative' }}>
      <D3ColorLegend />
      <div id="dataviz_axisZoom" ref={svgRef}></div>
      <Tooltip interactionData={details} />
    </div>
  );
};

export default Scatterplot;
