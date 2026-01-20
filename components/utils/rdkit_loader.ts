import _ from "lodash";
import { GraphEdge, GraphNode, ScaffoldGraph } from "../../types/GraphData";

function colorOfEdge(edge: string) {
  if (edge === "Fragment") return "#99ccff";
  if (edge === "Generic") return "#ff9999";
  if (edge === "GenericBond") return "#99ff99";
  if (edge === "RemoveAttachment") return "#666666";
  return "#cccc66";
}

export function molListFromSmiArray(smiArray, rdkit) {
  const molList = new rdkit.MolList();
  smiArray.forEach((smiName) => {
    const [smi, name] = smiName.split(" ");
    let mol;
    try {
      mol = rdkit.get_mol(smi);
      molList.append(mol);
    } finally {
      mol?.delete();
    }
  });
  return molList;
}

export function scaffold_net_chunking_method(
  array: any[],
  chunkSize: number,
  rdkit,
  params,
) {
  var scaffold_net_ins = new rdkit.ScaffoldNetwork();
  scaffold_net_ins.set_scaffold_params(JSON.stringify(params));
  let network;

  for (let i = 0; i < array.length; i += chunkSize) {
    let smiles_mol_list;
    try {
      smiles_mol_list = molListFromSmiArray(
        array.slice(i, i + chunkSize),
        rdkit,
      );
      network = scaffold_net_ins.update_scaffold_network(smiles_mol_list);
    } catch (e) {
      console.error(e);
    } finally {
      smiles_mol_list?.delete();
    }
  }
  scaffold_net_ins?.delete();

  // Return plain object instead of graphology Graph
  const nodes: GraphNode[] = [];
  for (let i = 0; i < network.nodes.size(); i++) {
    try {
      var smiles_string = network.nodes.get(i);
      nodes.push({
        id: i.toString(),
        smiles: smiles_string,
        molCounts: network.molCounts.get(i),
        nodeType: array.includes(smiles_string) ? "whole" : "fragment",
      });
    } catch (e) {
      console.error("Error in adding node: ", e);
    }
  }

  const edges: GraphEdge[] = [];
  for (let i = 0; i < network.edges.size(); i++) {
    try {
      let network_edge = network.edges.get(i);
      edges.push({
        id: i.toString(),
        source: network_edge.beginIdx.toString(),
        target: network_edge.endIdx.toString(),
        label: network_edge.type,
        color: colorOfEdge(network_edge.type),
      });
    } catch (e) {
      console.error("Error in adding edge: ", e);
    }
  }

  return { nodes, edges };
}

export function graph_molecule_image_generator(rdkit, graphData, svgSize = 120) {
  try {
    graphData.nodes.forEach((node) => {
      var mol = rdkit.get_mol(node.smiles);
      var svg_string = mol.get_svg(svgSize, svgSize);
      var blob_link = new Blob([svg_string], { type: "image/svg+xml" });
      node.image = URL.createObjectURL(blob_link);
      mol?.delete();
    });
  } catch (e) {
    console.error(e);
  }
  return graphData;
}

// Serialize plain object to JSON (works in workers)
export function serializeGraph(graph: ScaffoldGraph) {
  return JSON.stringify(graph);
}

// Deserialize from JSON
export function deserializeGraph(json: string): ScaffoldGraph {
  return JSON.parse(json);
}

export const initRDKit = (() => {
  let rdkitLoadingPromise: Promise<any>;
  return (): Promise<any> => {
    if (!rdkitLoadingPromise) {
      rdkitLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/rdkit/RDKit_minimal.js";
        script.async = true;
        document.body.appendChild(script);
        script.addEventListener("load", () => {
          globalThis
            .initRDKitModule()
            .then((RDKit) => {
              resolve(RDKit);
            })
            .catch((e) => {
              alert("RDKIT Cannot be Loaded");
            });
        });
      });
    }
    return rdkitLoadingPromise;
  };
})();
