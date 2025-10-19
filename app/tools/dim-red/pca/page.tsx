"use client"

import { useContext, useEffect, useRef, useState } from "react";
import LigandContext from "../../../../context/LigandContext";
import PyodideContext from "../../../../context/PyodideContext";
import Scatterplot from "../../../../components/tools/toolViz/ScatterPlot";
import Loader from "../../../../components/ui-comps/Loader";
import TargetContext from "../../../../context/TargetContext";
import { Button } from "@mantine/core";

export default function PCA() {
    const { ligand, setLigand } = useContext(LigandContext);
    const { target } = useContext(TargetContext);
    const { pyodide } = useContext(PyodideContext);
    const [pca, setPCA] = useState<any[]>([]);
    const containerRef = useRef(null);
    const [loaded, setLoaded] = useState(false);

    // useEffect(() => {
    //     setLoaded(false);
    //     if (ligand.some(obj => obj.pca)) {
    //         setPCA(ligand.map(obj => obj.pca));
    //         setLoaded(true);
    //     } else {
    //         runDimRed();
    //     }
    // }, []);

    globalThis.fp = ligand.map((obj) => obj.fingerprint);

    async function runDimRed() {
        setLoaded(false);
        await pyodide.runPython(`
      from sklearn.decomposition import PCA
      import js

      pca = PCA(n_components=2)
      result = pca.fit_transform(js.fp)
      js.pca = result
    `);
        const pca_result = globalThis.pca.toJs();
        const pca_data_in = pca_result.map(([x, y]) => ({ x, y }));
        let new_ligand = ligand.map((obj, index) => ({
            ...obj,
            pca: pca_data_in[index],
        }));
        setLigand(new_ligand);
        setPCA(pca_data_in);
        setLoaded(true);
    }

    return (
        <div className="tools-container" ref={containerRef}>
            <h1>Principal Component Analysis</h1>
            <Button onClick={() => runDimRed()}>Run PCA</Button>
            <p>Caution: this may freeze the browser tab for a while. Geek speak: Pyodide runs on the main thread
                and PCA computation is blocking.
            </p>
            {pca.length > 0 && (
                <Scatterplot
                    data={pca}
                    colorProperty={ligand.map((obj) => obj[target.activity_columns[0]])}
                    hoverProp={ligand.map((obj) => obj.canonical_smiles)}
                    xAxisTitle={"Principal Component 1"}
                    yAxisTitle={"Principal Component 2"}
                    id={ligand.map((obj) => obj.id)}
                />
            )}
        </div>
    );
}