import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ScaffoldNetworkWholeGraph = ({ graph, imageSize = 120 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    const width = 928;
    const height = 680;


    const graph_ex = graph.export();
    const { nodes, links } = {
      nodes: graph_ex.nodes.map(n => ({ id: n.key, ...n.attributes })),
      links: graph_ex.edges
    }
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;")
      .call(d3.zoom().on("zoom", function (event) {
        svg.attr("transform", event.transform);
      }));

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.5)
      .selectAll("line")
      .data(links)
      .attr("stroke", d => d.color)
      .join("line")
      .attr("stroke-width", 0.5)

    const node = svg.append("g")
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("xlink:href", d => d.image) // Function to get image URL
      .attr("width", imageSize * 0.10) // Adjust image width
      .attr("height", imageSize * 0.10); // Adjust image height

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
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("x", d => d.x)
        .attr("y", d => d.y);
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

  return <svg ref={svgRef} width="100%" height="80vh" />;
};

export default ScaffoldNetworkWholeGraph;