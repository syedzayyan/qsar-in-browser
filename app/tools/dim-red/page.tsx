"use client"

import { useContext, useEffect, useRef, useState } from "react"
import LigandContext from "../../../context/LigandContext"
import PyodideContext from "../../../context/PyodideContext";
import Scatterplot from "../../../components/tools/toolViz/ScatterPlot";
import { useSearchParams } from "next/navigation";
import Loader from "../../../components/ui-comps/Loader";

export default function DimRed(){

    const {ligand} = useContext(LigandContext);
    const { pyodide } = useContext(PyodideContext);
    const [pca, setPCA] = useState<any[]>([])
    const [whatDimRed, setWhatDimRef] = useState('')
    const [pcaCorrectTSNE, setPCACorrectTSNE] = useState(true)

    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        setWhatDimRef(window.location.hash);
        setLoaded(false)
        setTimeout(() => {
            runDimRed();
        }, 100);   

    }, [useSearchParams()])

    var data = ligand.map((obj) => obj.pKi);
    var smi = ligand.map((obj) => obj.canonical_smiles);
    globalThis.fp = ligand.map((obj) => obj.fingerprint);


    function runDimRed(pcaCorrect=true){
        setLoaded(false);
        let opts: number;
        switch (whatDimRed) {
            case "#pca":
                opts = 1
            case "#tsne":
                if (pcaCorrect){
                    opts = 2
                } else {
                    opts = 3
                }
        }
        
        globalThis.opts = opts;
        pyodide.runPython(`
            from sklearn.decomposition import PCA
            from sklearn.manifold import TSNE
            import js

            result = 0

            if js.opts == 1:
                pca = PCA(n_components=2)
                result = pca.fit_transform(js.fp)
            elif js.opts == 2:
                pca = PCA(n_components=30)
                pca_drugs = pca.fit_transform(js.fp)
                model = TSNE(n_components=2, random_state=0, perplexity=30, n_iter=5000)
                result = model.fit_transform(pca_drugs)
            elif js.opts == 3:
                model = TSNE(n_components=2, random_state=0, perplexity=30, n_iter=5000)
                result = model.fit_transform(js.fp)

            js.pca = result
        `)
        const pca_result = (globalThis.pca).toJs();;
        const pca_data_in = pca_result.map(([x, y]) => ({ x, y }));
        setPCA(pca_data_in)

        setLoaded(true)
    }
    if (loaded) {
        return(
            <div className="tools-container" ref={containerRef}>
                {whatDimRed === "#pca" && (
                    <>
                    </>
                )}
                {whatDimRed === "#tsne" && (
                    <div className="container">
                        <input type = "checkbox" defaultChecked onChange = {(e) => {setPCACorrectTSNE(e.target.checked)}}></input>
                        <label htmlFor="tsne_perplexity">Perplexity</label>
                        <input className="input" id = "tsne_perplexity"></input>
                        <label htmlFor="tsne_n_iter">Number of Iterations</label>
                        <input className="input" id = "tsne_n_iter"></input>
                        <button className="button" onClick={() => runDimRed(pcaCorrectTSNE)}>Run tSNE</button>
                    </div>
                )}
                {pca.length > 0 && 
                    <Scatterplot 
                        data = {pca} 
                        colorProperty={data}
                        hoverProp={smi}
                        xAxisTitle={"Principal Component 1"}
                        yAxisTitle={"Principal Component 2"}
                        heit={containerSize.height - 40}
                        wid={containerSize.width - 20}
                    />
                }
            </div>
        )        
    } else {
        return (
            <div className="tools-container">
                <Loader />
            </div>
        )
    }
}