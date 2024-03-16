"use client";

import { useContext, useEffect, useState } from "react";
import RDKitContext from "../../../context/RDKitContext";
import LigandContext from "../../../context/LigandContext";

import { scaffold_net_chunking_method } from "../../../components/utils/rdkit_loader";
import Loader from "../../../components/ui-comps/Loader";
import ScaffoldNetworkWholeGraph from "../../../components/tools/toolComp/ScaffoldNetworkWholeGraph";
import loadGraphFromScaffNet from "../../../components/utils/loadGraphFromScaffNet";
import TabWrapper, {
  Tabs,
} from "../../../components/ui-comps/TabbedComponents";
import ScaffNetDets from "../../../components/tools/toolComp/ScaffNetDets";

export default function DisplayGraph() {
  const { rdkit } = useContext(RDKitContext);
  const { ligand } = useContext(LigandContext);
  const [loaded, setLoaded] = useState(false);
  const [graph, setGraph] = useState<any>();

  useEffect(() => {
    setLoaded(false);
    setTimeout(() => {
      let smiles_list = ligand.map((x) => x.canonical_smiles);
      const network = scaffold_net_chunking_method(smiles_list, 50, rdkit);
      const graph = loadGraphFromScaffNet(network, smiles_list, rdkit);
      setGraph(graph);
      setLoaded(true);
    }, 80);
  }, []);

  if (!loaded) {
    return (
      <div className="tools-container">
        <Loader loadingText="Networking is hard..." />
      </div>
    );
  }

  return (
    <div className="tools-container">
      <h1>Scaffold Network</h1>
      <TabWrapper>
        <Tabs title="Network Settings">
          <div>
            <p>Settings go here</p>
          </div>
        </Tabs>
        <Tabs title="Network Details">
          <ScaffNetDets graph={graph} />
        </Tabs>
        <Tabs title="Whole Network">
          <ScaffoldNetworkWholeGraph graph={graph} />
        </Tabs>
      </TabWrapper>
    </div>
  );
}
