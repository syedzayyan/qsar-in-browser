"use client";
import { useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import { mean, median, mode, round } from "mathjs";
import TargetContext from "../../../context/TargetContext";

export default function Activity() {
  const { ligand, setLigand } = useContext(LigandContext) || { ligand: [], setLigand: undefined };
  const { target } = useContext(TargetContext) || { target: { activity_columns: [] } };

  const data =
    Array.isArray(ligand) && ligand.length > 0 && target?.activity_columns?.length > 0
      ? ligand.map((obj) => obj[target.activity_columns[0]])
      : [];

  /**
   * Remove the given molecules from the ligand list.
   * Uses the molecule's `id` field as the unique key so even partial
   * bin overlaps can't accidentally drop the wrong entries.
   */
  const handleRemove = (toRemove: any[]) => {
    if (!setLigand) return;
    const removeIds = new Set(toRemove.map((m) => m.id));
    setLigand((prev: any[]) => prev.filter((m) => !removeIds.has(m.id)));
  };

  return (
    <div className="tools-container">
      <h1>Activity Distribution</h1>
      <Histogram
        data={data}
        xLabel={target?.activity_columns?.[0] || ""}
        yLabel="Count"
        toolTipData={ligand}
        onRemove={setLigand ? handleRemove : undefined}
      >
        <span>
          {data.length > 0 ? (
            <>
              Mean : {round(mean(data), 2) || ""} || Median : {round(median(data), 2) || ""} ||
              Mode : {round(mode(data), 2) || ""}
            </>
          ) : (
            <>No activity data available</>
          )}
        </span>
      </Histogram>
    </div>
  );
}