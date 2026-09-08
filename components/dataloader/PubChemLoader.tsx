import { useState } from "react";
import { SegmentedControl } from "@mantine/core";
import UniProtTargetGetter from "./UniProtTargetGetter";
import PubChemSimilarityGetter from "./PubChemSimilarityGetter";

export default function PubChemLoader() {
  const [mode, setMode] = useState<"target" | "similarity">("target");

  return (
    <div>
      <div style={{ width: "90%", margin: "0 auto 20px" }}>
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={(v) => setMode(v as "target" | "similarity")}
          data={[
            { label: "By Biological Target", value: "target" },
            { label: "By Structure Similarity", value: "similarity" },
          ]}
        />
      </div>

      {mode === "target" ? <UniProtTargetGetter /> : <PubChemSimilarityGetter />}
    </div>
  );
}
