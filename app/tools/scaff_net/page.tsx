"use client";

import { useContext, useEffect, useState } from "react";
import Loader from "../../../components/ui-comps/Loader";
import ScaffoldNetworkWholeGraph from "../../../components/tools/toolComp/ScaffoldNetworkWholeGraph";
import TabWrapper, { Tabs } from "../../../components/ui-comps/TabbedComponents";
import ScaffNetDets from "../../../components/tools/toolComp/ScaffNetDets";
import ScaffoldSettings from "../../../components/tools/toolComp/ScaffoldSettings";
import TargetContext from "../../../context/TargetContext";
import { graph_molecule_image_generator } from "../../../components/utils/rdkit_loader";
import RDKitContext from "../../../context/RDKitContext";
import { MultiDirectedGraph } from "graphology";

export default function DisplayGraph() {
  const [loaded, setLoaded] = useState(true);
  const [graph, setGraph] = useState<any>();
  const [defaultTab, setDefaultTab] = useState(0);
  const { target } = useContext(TargetContext);
  const { rdkit } = useContext(RDKitContext);

  useEffect(() => {
    if (target.scaffold_network != ""){
      setLoaded(false);
      setTimeout(() => {
        let network_graph = new MultiDirectedGraph();
        network_graph.import(target.scaffold_network);
        let image_graph = graph_molecule_image_generator(rdkit, network_graph);
        setGraph(image_graph);
      }, 100)
      setLoaded(true);
      setDefaultTab(1)
    }
  }, [])

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
      <TabWrapper defaultTab={defaultTab}>
        <Tabs title="Network Settings">
          <ScaffoldSettings
            setGraph={setGraph}
            setLoaded={setLoaded}
            activeTabChange = {setDefaultTab}
          />
        </Tabs>
        <Tabs title="Network Details">
        {graph != undefined && <ScaffNetDets graph={graph} />}
        </Tabs>
        <Tabs title="Whole Network">
          {graph != undefined && <ScaffoldNetworkWholeGraph graph={graph} imageSize={200}/>}
        </Tabs>
      </TabWrapper>
    </div>
  );
}
