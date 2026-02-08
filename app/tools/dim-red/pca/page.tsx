"use client"

import { useContext, useEffect, useRef, useState } from "react";
import LigandContext from "../../../../context/LigandContext";
import PyodideContext from "../../../../context/PyodideContext";
import Scatterplot from "../../../../components/tools/toolViz/ScatterPlot";
import TargetContext from "../../../../context/TargetContext";

import { Button, Group, Modal } from "@mantine/core";
import NotificationContext from "../../../../context/NotificationContext";

export default function PCA() {
    const { setLigand, ligand } = useContext(LigandContext);
    const { target } = useContext(TargetContext);
    const { pyodide } = useContext(PyodideContext);
    const { notifications, pushNotification } = useContext(NotificationContext);

    const [opened, setOpened] = useState(false);
    const [indicesToDelete, setIndicesToDelete] = useState<number[]>([]);
    const close = () => setOpened(false);

    const containerRef = useRef(null);

    async function runDimRed() {
        pushNotification({
            id: "job-pca",          // <- consistent job ID
            message: "Running PCA...",
            autoClose: true,
            done: false,
            type: 'info'
        });
        const msg = {
            id: "pca-123",
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

    const isRunning = notifications.some(n => n.id === "job-pca" && n.done === false);


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
                    <p>Explained Variance by first 2 Principal Components: {target.pca_explained_variance}</p>
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
                    />
                </>
            )}
        </div>
    );
}