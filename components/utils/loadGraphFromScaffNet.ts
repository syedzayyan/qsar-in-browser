import { MultiDirectedGraph } from "graphology";

function colorOfEdge(edge: string) {
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
  rdkit: any,
  svgSize = 120
) {
  const graph = new MultiDirectedGraph();
  for (let i = 0; i < network.nodes.size(); i++) {
    const smiles_string = network.nodes.get(i);
    const mol = rdkit.get_mol(smiles_string);
    const svg_string = mol.get_svg(svgSize, svgSize);
    const blob_link = new Blob([svg_string], { type: "image/svg+xml" });
    mol.delete();


    try {
      graph.addNode(i.toString(), {
        molCounts: network.molCounts.get(i),
        // size: 4,
        smiles: smiles_string,
        nodeType: smilesList.includes(smiles_string) ? "whole" : "fragment",
        image: URL.createObjectURL(blob_link),
        // color: smilesList.includes(network.nodes.get(i)) ? "grey" : "blue",
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
