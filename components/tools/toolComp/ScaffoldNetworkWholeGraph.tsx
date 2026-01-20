import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import ScaffEdgeLegend from './ScaffLegend';

const ScaffoldNetworkWholeGraph = ({ graph, imageSize = 120, width = 928, height = 680 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    // Clear previous SVG elements
    d3.select(svgRef.current).selectAll("*").remove();

    // Create a fake root node
    const fakeRoot = { id: 'fakeRoot', children: [] };
    const { nodes, links } = {
      nodes: [
        { id: 'fakeRoot', children: [] },
        ...graph.nodes.map(n => ({ id: n.id, ...n }))
      ],
      links: graph.edges.map(e => ({
        source: e.source,
        target: e.target,
        ...e
      }))
    };

    // Make all existing root nodes children of the fake root node
    nodes.forEach(node => {
      if (node.id !== 'fakeRoot' && !links.some(link => link.target === node.id)) {
        fakeRoot.children.push(node.id);
      }
    });

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;")
      .call(d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
          svgGroup.attr("transform", event.transform);
        })
      );

    const svgGroup = svg.append("g");

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100)) // Increase link distance
      .force("charge", d3.forceManyBody().strength(-300)) // Increase repulsion strength
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(imageSize * 0.2)); // Add collision force to prevent overlap

    const link = svgGroup.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", d => Math.sqrt(d.value))
      .attr("stroke", d => d.color);

    const node = svgGroup.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("image")
      .data(nodes)
      .enter().append("image")
      .attr("xlink:href", d => d.image) // Function to get image URL
      .attr("width", d => d.id === 'fakeRoot' ? 0 : imageSize * 0.2) // Adjust image width
      .attr("height", d => d.id === 'fakeRoot' ? 0 : imageSize * 0.2) // Adjust image height
      .call(drag(simulation));

    node.append("title")
      .text(d => d.smiles);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("x", d => d.x - imageSize * 0.1) // Center the image
        .attr("y", d => d.y - imageSize * 0.1); // Center the image
    });

    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

  }, [graph, imageSize]); // Ensure the effect runs only when `graph` or `imageSize` changes

  return (
    <>
      <ScaffEdgeLegend />
      <svg ref={svgRef} height="600px" width="100%" />
    </>

  );
};

export default ScaffoldNetworkWholeGraph;
