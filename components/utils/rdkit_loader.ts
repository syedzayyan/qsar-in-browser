import _ from "lodash";
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
  scaffold_net_ins.set_scaffold_params(JSON.stringify(params))
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
  var graph = new MultiDirectedGraph();
  
  for (let i = 0; i < network.nodes.size(); i++) {
    try {
      var smiles_string = network.nodes.get(i);
      graph.addNode(i.toString(), {
        molCounts: network.molCounts.get(i),
        smiles: smiles_string,
        nodeType: array.includes(smiles_string) ? "whole" : "fragment",
      });
    } catch (e) {
      console.error("Error in adding node to graph: ", e);
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
    } catch (e) {
      console.error("Error in adding edge to graph: ", e);
    }
  }
  
  return graph;
}

export function graph_molecule_image_generator(rdkit, graph, svgSize = 120){
  let new_graph = graph;
  try{
    new_graph.forEachNode((node, attr) => {
      var mol = rdkit.get_mol(attr.smiles);
      var svg_string = mol.get_svg(svgSize, svgSize);
      var blob_link = new Blob([svg_string], { type: "image/svg+xml" });
      new_graph.setNodeAttribute(node, 'image', URL.createObjectURL(blob_link))
      mol?.delete();
    })
  }catch(e){
    console.error(e)
  }
  return new_graph;
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
