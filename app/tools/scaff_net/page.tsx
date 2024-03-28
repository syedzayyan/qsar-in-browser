"use client";

import { useState } from "react";
import Loader from "../../../components/ui-comps/Loader";
import ScaffoldNetworkWholeGraph from "../../../components/tools/toolComp/ScaffoldNetworkWholeGraph";
import TabWrapper, { Tabs } from "../../../components/ui-comps/TabbedComponents";
import ScaffNetDets from "../../../components/tools/toolComp/ScaffNetDets";
import ScaffoldSettings from "../../../components/tools/toolComp/ScaffoldSettings";

export default function DisplayGraph() {
  const [loaded, setLoaded] = useState(true);
  const [graph, setGraph] = useState<any>();
  const [defaultTab, setDefaultTab] = useState(0);

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
          <ScaffNetDets graph={graph} />
        </Tabs>
        <Tabs title="Whole Network">
          <ScaffoldNetworkWholeGraph graph={graph} />
        </Tabs>
      </TabWrapper>
    </div>
  );
}
