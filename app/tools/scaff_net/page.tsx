"use client";

import { useContext, useEffect, useState } from "react";
import Loader from "../../../components/ui-comps/Loader";
import ScaffoldNetworkWholeGraph from "../../../components/tools/toolComp/ScaffoldNetworkWholeGraph";
import ScaffNetDets from "../../../components/tools/toolComp/ScaffNetDets";
import ScaffoldSettings from "../../../components/tools/toolComp/ScaffoldSettings";
import TargetContext from "../../../context/TargetContext";
import { graph_molecule_image_generator } from "../../../components/utils/rdkit_loader";
import RDKitContext from "../../../context/RDKitContext";
import { MultiDirectedGraph } from "graphology";
import { Tabs } from "@mantine/core";

export default function DisplayGraph() {
  const [loaded, setLoaded] = useState(true);
  const [graph, setGraph] = useState<any>();
  const [defaultTab, setDefaultTab] = useState(0);
  const { target } = useContext(TargetContext);
  const { rdkit } = useContext(RDKitContext);

  useEffect(() => {
    if (target.scaffold_network != "") {
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

      <Tabs defaultValue="Network_Settings">
      <Tabs.List>
        <Tabs.Tab value="Network_Details">
          Network Settings
        </Tabs.Tab>
        <Tabs.Tab value="Network_Details" >
          Network Details
        </Tabs.Tab>
        <Tabs.Tab value="Whole_Network">
          Whole Network
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="Network_Details">
        <ScaffoldSettings
          setGraph={setGraph}
          setLoaded={setLoaded}
          activeTabChange={setDefaultTab}
        />
      </Tabs.Panel>

      <Tabs.Panel value="Network_Details">
        {graph != undefined && <ScaffNetDets graph={graph} />}
      </Tabs.Panel>

      <Tabs.Panel value="Whole_Network">
        {graph != undefined && <ScaffoldNetworkWholeGraph graph={graph} imageSize={200} />}
      </Tabs.Panel>
    </Tabs>
    </div >
  );
}
