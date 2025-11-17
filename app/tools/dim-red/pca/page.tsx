"use client"

import { useContext, useEffect, useRef, useState } from "react";
import LigandContext from "../../../../context/LigandContext";
import PyodideContext from "../../../../context/PyodideContext";
import Scatterplot from "../../../../components/tools/toolViz/ScatterPlot";
import TargetContext from "../../../../context/TargetContext";
import { Button } from "@mantine/core";

export default function PCA() {
    const { ligand } = useContext(LigandContext) || { ligand: [] };
    const { target } = useContext(TargetContext) || { target: { activity_columns: [] } };
    const { pyodide } = useContext(PyodideContext) || { pyodide: null };
    const containerRef = useRef(null);

    async function runDimRed() {
        const msg = {
            id: "job-123",
            opts: 1,
            func: "dim_red",
            fp: ligand.map((obj) => obj.fingerprint),
            params: {
                n_components: 2,
                pca_pre_components: 30,
                random_state: 42
            }
        };

        pyodide.postMessage(msg);
    }

    return (
        <div className="tools-container" ref={containerRef}>
            <h1>Principal Component Analysis</h1>
            <Button onClick={() => runDimRed()}>Run PCA</Button>
            {Array.isArray(ligand) && ligand.length > 0 && ligand[0] && ligand[0].pca && (
                <>
                    {/* <p>Explained Variance by first 2 Principal Components: {globalThis.explain_variance.toFixed(2)}</p> */}
                    <br></br>
                    <Scatterplot
                        data={ligand.map((obj) => {
                            const [x, y] = obj.pca;
                            return { x, y };
                        })}
                        colorProperty={ligand.map((obj) => obj[target?.activity_columns?.[0]])}
                        hoverProp={ligand.map((obj) => obj.canonical_smiles)}
                        xAxisTitle={"Principal Component 1"}
                        yAxisTitle={"Principal Component 2"}
                        id={ligand.map((obj) => obj.id)}
                    />
                </>
            )}
        </div>
    );
}