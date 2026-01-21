"use client"

import { useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import { mean, median, mode, round } from "mathjs";
import TargetContext from "../../../context/TargetContext";

export default function Activity() {
    const { ligand } = useContext(LigandContext) || { ligand: [] };
    const { target } = useContext(TargetContext) || { target: { activity_columns: [] } };

    const data = Array.isArray(ligand) && ligand.length > 0 && target?.activity_columns?.length > 0
        ? ligand.map((obj) => obj[target.activity_columns[0]])
        : [];
    
    return (
        <div className="tools-container">
            <Histogram data={data} xLabel={target?.activity_columns?.[0] || ""} yLabel="Count" toolTipData={ligand}>
                <span>
                    {data.length > 0 ? (
                        <>Mean : {round(mean(data), 2) || ""} || Median : {round(median(data), 2) || ""} || Mode : {round(mode(data), 2) || ""}</>
                    ) : (
                        <>No activity data available</>
                    )}
                </span>
            </Histogram>
        </div>
    )
}