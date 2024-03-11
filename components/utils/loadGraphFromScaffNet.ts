import { MultiDirectedGraph } from "graphology";
import { randomInt } from "mathjs";

function colorOfEdge(edge) {
  if (edge === "Fragment") {
    return "#99ccff"; // Muted Blue
  } else if (edge === "Generic") {
    return "#ff9999"; // Muted Red
  } else if (edge === "GenericBond") {
    return "#99ff99"; // Muted Green
  } else if (edge === "RemoveAttachment") {
    return "#666666"; // Dark Gray
  } else {
    return "#cccc66"; // Muted Yellow
  }
}

export default function loadGraphFromScaffNet(
  network: any,
  smilesList: string[],
) {
  const graph = new MultiDirectedGraph();
  for (let i = 0; i < network.nodes.size(); i++) {
    try {
      graph.addNode(i.toString(), {
        x: randomInt(0, 100),
        y: randomInt(0, 100),
        molCounts: network.molCounts.get(i),
        size: network.molCounts.get(i),
        smiles: network.nodes.get(i),
        nodeType: smilesList.includes(network.nodes.get(i))
          ? "whole"
          : "fragment",
        type: "image",
        image: "./logo.svg",
      });
    } catch {
      console.error("Error in adding node to graph");
    }
  }
  for (let i = 0; i < network.edges.size(); i++) {
    try {
      let network_edge = network.edges.get(i);
      graph.addEdgeWithKey(
        i.toString(),
        network_edge.beginIdx,
        network_edge.endIdx,
        {
          label: network_edge.type,
          color: colorOfEdge(network_edge.type),
        },
      );
    } catch {
      console.error("Error in adding edge to graph");
    }
  }
  return graph;
}
