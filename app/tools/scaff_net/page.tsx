"use client";

import { useContext, useEffect } from "react";
import ScaffoldNetworkWholeGraph from "../../../components/tools/toolComp/ScaffoldNetworkWholeGraph";
import ScaffNetDets from "../../../components/tools/toolComp/ScaffNetDets";
import ScaffoldSettings from "../../../components/tools/toolComp/ScaffoldSettings";
import TargetContext from "../../../context/TargetContext";
import { deserializeGraph, graph_molecule_image_generator } from "../../../components/utils/rdkit_loader";
import RDKitContext from "../../../context/RDKitContext";
import { Tabs } from "@mantine/core";

export default function DisplayGraph() {
  const { target } = useContext(TargetContext);
  const { rdkit } = useContext(RDKitContext);

  // useEffect(() => {
  //   if (target.scaffold_network != undefined) {
  //     setTimeout(() => {
  //       // Replace graphology with plain object
  //       const network_graph = deserializeGraph(target.scaffold_network);
  //       const image_graph = graph_molecule_image_generator(rdkit, network_graph);
  //     }, 100);
  //   }
  // }, []);

  return (
    <div className="tools-container">
      <p>
        Caution: this may freeze the browser tab for a while. Geek speak: Pyodide runs on the main thread
        and MMA computation is blocking.
      </p>
      <h1>Scaffold Network</h1>

      <Tabs defaultValue="Network_Settings">
        <Tabs.List>
          <Tabs.Tab value="Network_Settings">
            Network Settings
          </Tabs.Tab>
          <Tabs.Tab value="Network_Details" >
            Network Details
          </Tabs.Tab>
          <Tabs.Tab value="Whole_Network">
            Whole Network
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="Network_Settings">
          <ScaffoldSettings
          />
        </Tabs.Panel>

        <Tabs.Panel value="Network_Details">
          {target.scaffold_network != undefined && <ScaffNetDets />}
        </Tabs.Panel>

        <Tabs.Panel value="Whole_Network">
          {target.scaffold_network != undefined && <ScaffoldNetworkWholeGraph imageSize={200} />}
        </Tabs.Panel>
      </Tabs>
    </div >
  );
}
