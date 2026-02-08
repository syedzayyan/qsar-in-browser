"use client"

import { useContext, useEffect, useRef, useState } from "react";
import LigandContext from "../../../../context/LigandContext";
import PyodideContext from "../../../../context/PyodideContext";
import Scatterplot from "../../../../components/tools/toolViz/ScatterPlot";
import Loader from "../../../../components/ui-comps/Loader";
import TargetContext from "../../../../context/TargetContext";
import { useForm } from "react-hook-form";
import { Button, Group, Modal } from "@mantine/core";
import NotificationContext from "../../../../context/NotificationContext";

type tsneType = {
  perplexity: number;
  n_iter: number;
  pca_correct: boolean;
  n_jobs: number;
}

export default function TSNE() {
  const { ligand, setLigand } = useContext(LigandContext) || { ligand: [], setLigand: () => { } };
  const { target } = useContext(TargetContext);
  const { pyodide } = useContext(PyodideContext) || { pyodide: null };
  const [pca, setPCA] = useState<any[]>([]);
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const { notifications, pushNotification } = useContext(NotificationContext);

  const { register, handleSubmit, watch, formState: { errors }, } = useForm<tsneType>()
  const [opened, setOpened] = useState(false);
  const [indicesToDelete, setIndicesToDelete] = useState<number[]>([]);
  const close = () => setOpened(false);

  function handleDelete() {
    setLigand(prevLigand => {
      const updated = prevLigand.filter(
        (_, idx) => !indicesToDelete.includes(idx)
      );
      return updated;
    });
    close();
  }
  if (Array.isArray(ligand)) {
    globalThis.fp = ligand.map((obj) => obj.fingerprint);
  } else {
    globalThis.fp = [];
  }

  async function runDimRed(formStuff: tsneType) {
    setLoaded(false);
    const requestId = `tsne_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    pushNotification({ id: requestId, message: "Running tSNE...", done: false, type: 'info' });

    const msg = {
      id: requestId,
      opts: formStuff.pca_correct ? 2 : 3,
      fp: globalThis.fp,
      func: "dim_red",
      params: {
        n_components: 2,
        pca_pre_components: 30,
        perplexity: formStuff.perplexity,
        n_iter: formStuff.n_iter,
        n_jobs: formStuff.n_jobs,
        random_state: 42
      }
    };

    pyodide.postMessage(msg);

    setLoaded(true);
  }

  const isRunning = notifications.some(n => n.id.includes("tsne_") && n.done === false);

  return (
    <div className="tools-container" ref={containerRef}>
      <h1>t-distributed Stochastic Neighbor Embedding</h1>
      <Button onClick={() => runDimRed({
        perplexity: 30,
        n_iter: 1000,
        pca_correct: true,
        n_jobs: 4,
      })}
      
      disabled={isRunning}>{isRunning ? "tSNE Running..." : "Run tSNE"}</Button>
      <p>Caution: this may freeze the browser tab for a while. Geek speak: Pyodide runs on the main thread
        and tSNE computation is blocking.
      </p>
      <details open={pca.length < 0}>
        <summary>tSNE settings</summary>
        <form onSubmit={handleSubmit(runDimRed)} className="ml-forms" style={{ width: "200px" }}>
          <div>
            <label htmlFor="tsne_perplexity">PCA Correction</label>
            <input type="checkbox" defaultChecked  {...register("pca_correct")}></input>
          </div>
          <label htmlFor="tsne_perplexity">Perplexity</label>
          <input className="input" defaultValue={30} id="tsne_perplexity"  {...register("perplexity")}></input>

          <label htmlFor="tsne_n_iter">Number of Iterations</label>
          <input className="input" defaultValue={1000} id="tsne_n_iter"  {...register("n_iter")}></input>

          <label htmlFor="tsne_n_jobs">Number of CPU</label>
          <input className="input" defaultValue={-1} id="tsne_n_jobs" {...register("n_jobs")}></input>

          <input type="submit" className="button" value={"Run tSNE"} />
        </form>
      </details>
      {Array.isArray(ligand) && ligand.length > 0 && ligand[0] && ligand[0].tsne && (
        <>
          <p>Explained Variance by first 2 Principal Components: {target.tsne_explained_variance}</p>
          <br></br>
            <Modal opened={opened} onClose={close} title="Delete Molecules?">
                <p>Are you sure you want to delete the selected molecules?</p>
                <Group gap={"2rem"}>
                    <Button onClick={close}>Cancel</Button>
                    <Button onClick={handleDelete}>Delete</Button>
                </Group>
            </Modal>
          <Scatterplot
            data={ligand.map((obj) => {
              const [x, y] = obj.tsne;
              return { x, y };
            })}
            colorProperty={ligand.map((obj) => obj[target.activity_columns[0]])}
            hoverProp={ligand.map((obj) => obj.canonical_smiles)}
            xAxisTitle={"t-SNE Dimension 1"}
            yAxisTitle={"t-SNE Dimension 2"}
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