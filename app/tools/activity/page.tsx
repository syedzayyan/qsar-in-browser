"use client"

import { useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import { mean, median, mode, round } from "mathjs";
import TargetContext from "../../../context/TargetContext";

export default function Activity() {
    const { ligand } = useContext(LigandContext);
    const { target } = useContext(TargetContext);
    var data = ligand.map((obj) => obj["neg_log_activity_column"]);

    return (
        <div className="tools-container">
            <Histogram data={data} xLabel={target.activity_type} yLabel="Count" toolTipData={ligand}>
                <span>Mean : {round(mean(data), 2) } || Median : {round(median(data), 2)} || Mode : {round(mode(data), 2)}</span>
            </Histogram>
        </div>
    )
}