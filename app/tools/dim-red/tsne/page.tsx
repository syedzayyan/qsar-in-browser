"use client"

import { useContext, useEffect, useRef, useState } from "react";
import LigandContext from "../../../../context/LigandContext";
import PyodideContext from "../../../../context/PyodideContext";
import Scatterplot from "../../../../components/tools/toolViz/ScatterPlot";
import Loader from "../../../../components/ui-comps/Loader";
import TargetContext from "../../../../context/TargetContext";

export default function TSNE() {
  const { ligand, setLigand } = useContext(LigandContext);
  const { target } = useContext(TargetContext)
  const { pyodide } = useContext(PyodideContext);
  const [pca, setPCA] = useState<any[]>([]);
  const [pcaCorrectTSNE, setPCACorrectTSNE] = useState(true);
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (ligand.some(obj => obj.tsne)) {
      setPCA(ligand.map(obj => obj.tsne));
      setLoaded(true);
    } else {
      runDimRed();
    }
  }, []);

  globalThis.fp = ligand.map((obj) => obj.fingerprint);
  globalThis.opts = pcaCorrectTSNE ? 2 : 3;

  async function runDimRed() {
    setLoaded(false);
    await pyodide.runPython(`
      from sklearn.decomposition import PCA
      from sklearn.manifold import TSNE
      import js

      if js.opts == 2:
          pca = PCA(n_components=30)
          pca_drugs = pca.fit_transform(js.fp)
          model = TSNE(n_components=2, random_state=0, perplexity=30, n_iter=5000)
          result = model.fit_transform(pca_drugs)
      elif js.opts == 3:
          model = TSNE(n_components=2, random_state=0, perplexity=30, n_iter=5000)
          result = model.fit_transform(js.fp)

      js.pca = result
    `);
    const pca_result = globalThis.pca.toJs();
    const pca_data_in = pca_result.map(([x, y]) => ({ x, y }));
    let new_ligand = ligand.map((obj, index) => ({
      ...obj,
      tsne: pca_data_in[index],
    }));
    setLigand(new_ligand);
    setPCA(pca_data_in);
    setLoaded(true);
  }

  return (
    <div className="tools-container" ref={containerRef}>
      <h1>t-distributed Stochastic Neighbor Embedding</h1>
      <details open={pca.length < 0}>
        <summary>tSNE settings</summary>
        <form>
          <label htmlFor="tsne_perplexity">PCA Correction</label>
          <input
            type="checkbox"
            defaultChecked
            onChange={(e) => setPCACorrectTSNE(e.target.checked)}
          ></input>
          <br />
          <label htmlFor="tsne_perplexity">Perplexity</label>
          <input className="input" id="tsne_perplexity"></input>
          <br />
          <label htmlFor="tsne_n_iter">Number of Iterations</label>
          <input className="input" id="tsne_n_iter"></input>
          <br />
          <button className="button" onClick={() => runDimRed()}>
            Run tSNE
          </button>
        </form>
      </details>
      {pca.length > 0 && (
        <Scatterplot
          data={pca}
          colorProperty={ligand.map((obj) => obj[target.activity_columns[0]])}
          hoverProp={ligand.map((obj) => obj.canonical_smiles)}
          xAxisTitle={"t-SNE Dimension 1"}
          yAxisTitle={"t-SNE Dimension 2"}
          id={ligand.map((obj) => obj.id)}
        />
      )}
      {!loaded && <Loader loadingText="Doing tSNE Magic" />}
    </div>
  );
}