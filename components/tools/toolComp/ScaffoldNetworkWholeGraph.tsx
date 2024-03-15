import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ScaffoldNetworkWholeGraph = ({ graph, imageSize = 120 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    const width = 928;
    const height = 680;

    // Create a fake root node
    const fakeRoot = { id: 'fakeRoot', children: [] };
    const graph_ex = graph.export();
    const { nodes, links } = {
      nodes: [fakeRoot, ...graph_ex.nodes.map(n => ({ id: n.key, ...n.attributes }))],
      links: graph_ex.edges
    }

    // Make all existing root nodes children of the fake root node
    nodes.forEach(node => {
      if (node.id !== 'fakeRoot' && !links.some(link => link.target === node.id)) {
        fakeRoot.children.push(node.id);
      }
    });

    const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(50)) // Increase link distance
    .force("charge", d3.forceManyBody().strength(-30)) // Decrease repulsion strength
    .force("center", d3.forceCenter(width / 2, height / 2)); // Center the graph around the middle of the SVG

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;")
      .call(d3.zoom().on("zoom", function (event) {
        svg.attr("transform", event.transform);
      }));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", 0.6)
      .attr("stroke", d => d.attributes.color) // Set the stroke color dynamically based on data
      .attr("stroke-opacity", 0.5);

    const node = svg.append("g")
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("xlink:href", d => d.image) // Function to get image URL
      .attr("width", d => d.id === 'fakeRoot' ? 0 : imageSize * 0.2 ) // Adjust image width
      .attr("height", d => d.id === 'fakeRoot' ? 0 : imageSize * 0.2 ); // Adjust image height

    node.append("title")
      .text(d => d.smiles);

    // Add a drag behavior.
    node.call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

    // Set the position attributes of links and nodes each time the simulation ticks.
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => height - d.source.y) // Reverse the y-coordinate for source
        .attr("x2", d => d.target.x)
        .attr("y2", d => height - d.target.y); // Reverse the y-coordinate for target
    
      node
        .attr("x", d => d.x)
        .attr("y", d => height - d.y); // Reverse the y-coordinate for nodes
    });

    // Reheat the simulation when drag starts, and fix the subject position.
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

    // When this cell is re-run, stop the previous simulation. (This doesn’t
    // really matter since the target alpha is zero and the simulation will
    // stop naturally, but it’s a good practice.)
    // // invalidation.then(() => simulation.stop());

  }, [graph]);

  return <svg ref={svgRef} height="600px" width="100%"/>;
};

export default ScaffoldNetworkWholeGraph;
