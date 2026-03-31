"use client"

import { useContext, useEffect, useRef, useState } from "react";
import LigandContext from "../../../../context/LigandContext";
import PyodideContext from "../../../../context/PyodideContext";
import Scatterplot from "../../../../components/tools/toolViz/ScatterPlot";
import TargetContext from "../../../../context/TargetContext";

import { Button, Group, Modal } from "@mantine/core";
import NotificationContext from "../../../../context/NotificationContext";
import { round } from "mathjs";

export default function PCA() {
    const { setLigand, ligand } = useContext(LigandContext);
    const { target } = useContext(TargetContext);
    const { pyodide } = useContext(PyodideContext);
    const { notifications, pushNotification } = useContext(NotificationContext);

    const [opened, setOpened] = useState(false);
    const [indicesToDelete, setIndicesToDelete] = useState<number[]>([]);
    const close = () => setOpened(false);

    const containerRef = useRef(null);

    let requestId;
    
    async function runDimRed() {
        requestId = `pca_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        pushNotification({ id: requestId, message: "Running PCA...", done: false, type: 'info', autoClose: false });

        const msg = {
            id: requestId,
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

    function handleDelete() {
        setLigand(prevLigand => {
            const updated = prevLigand.filter(
                (_, idx) => !indicesToDelete.includes(idx)
            );
            return updated;
        });
        close();
    }

    const isRunning = notifications.some(n => n.id.includes("pca_") && n.done === false);


    return (
        <div className="tools-container" ref={containerRef}>
            <h1>Principal Component Analysis</h1>
            <Button onClick={runDimRed} disabled={isRunning}>
                {isRunning ? "PCA Running..." : "Run PCA"}
            </Button>


            <Modal opened={opened} onClose={close} title="Delete Molecules?">
                <p>Are you sure you want to delete the selected molecules?</p>
                <Group gap={"2rem"}>
                    <Button onClick={close}>Cancel</Button>
                    <Button onClick={handleDelete}>Delete</Button>
                </Group>
            </Modal>
            {Array.isArray(ligand) && ligand.length > 0 && ligand[0] && ligand[0].pca && (
                <>
                    <p>
                    The first two principal components explain{" "}
                    {Math.round(Number(target.pca_explained_variance) * 1000) / 10}% of the variation in
                    the molecular fingerprint data.
                    </p>

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
                        onSelectIndices={(indices) => {
                            setIndicesToDelete(indices);
                            setOpened(true);
                        }}
                        colorBarTitle={target?.activity_columns?.[0]}
                    />
                </>
            )}
            <details open={false}>
                <summary>How to interpret the PCA chemical space map</summary>
                <p>
                    Each point on this scatter plot represents a molecule. Similar molecules are closer together, 
                    while dissimilar molecules are further apart. Principal Component 1 (PC1) and Principal Component 
                    2 (PC2) do not necessarily correspond to intuitive chemical properties - instead they are a 
                    weighted sum of the most distinguishing features of the fingerprint across the dataset. 
                    In this case, PC1 and PC2 account for{" "}
                    {Math.round(Number(target.pca_explained_variance) * 1000) / 10}% of the variation across the molecular
                    fingerprint data.
                </p>
            </details>
            <details open={false}>
                <summary>Why use PCA to view chemical space?</summary>
                <p>
                    Molecular fingerprints contain a large amount of data on any given molecule - 100s or 1,000s of 
                    distinct chemical features. Visualising this data directly is extremely challenging, so 
                    cheminformaticians use PCA to approximate molecular fingerprints into two or three 'Principal 
                    Components', allowing a visualisation of this dataset's chemical space. 
                </p>
            </details>
            
        </div>
    );
}