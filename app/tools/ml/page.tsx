"use client"

import { useContext, useEffect, useState } from "react"
import LigandContext from "../../../context/LigandContext"
import PyodideContext from "../../../context/PyodideContext";
import { useSearchParams } from "next/navigation";
import Loader from "../../../components/ui-comps/Loader";
import RDKitContext from "../../../context/RDKitContext";
import GroupedBarChart from "../../../components/tools/toolViz/BarChart";
import { mean } from "mathjs";
import fpSorter from "../../../components/utils/fp_sorter";
import Scatterplot from "../../../components/tools/toolViz/ScatterPlot";
import RF from "../../../components/ml-forms/RF";
import XGB from "../../../components/ml-forms/XGB";
import ErrorContext from "../../../context/ErrorContext";

type dataChart = {
    x: number,
    y: number
}

export default function ML() {

    const { ligand } = useContext(LigandContext);
    const { pyodide } = useContext(PyodideContext);
    const { rdkit } = useContext(RDKitContext);
    const [whatMLModel, setWhatMLModel] = useState('');
    const [results, setResults] = useState([]);
    const [oneOffSMILES, setOneOffSmiles] = useState('CCO');
    const [oneOffSMILESResult, setOneOffSmilesResult] = useState<number>();

    const [foldState, setFoldState] = useState<dataChart[]>()
    const [foldNumSel, setFoldNumSel] = useState(0);

    const { setErrors } = useContext(ErrorContext)

    const [loaded, setLoaded] = useState(true);

    useEffect(() => {
        setWhatMLModel(window.location.hash);
        setResults([]);
    }, [useSearchParams()]);

    async function onSubmit(data) {
        try {
            if (whatMLModel == "#rf") {
                globalThis.opts = 1;
            } else if (whatMLModel == "#xgboost") {
                globalThis.opts = 2;
                await pyodide.loadPackage(['xgboost']);
            } else {
                globalThis.opts = 3
            }


            setLoaded(false)
            globalThis.model_parameters = data;

            globalThis.neg_log_activity_column = ligand.map((obj) => obj.neg_log_activity_column);
            globalThis.fp = ligand.map((obj) => obj.fingerprint);

            await pyodide.runPython(await (await fetch("/pyodide_ml.py")).text());

            const results = globalThis.metrics.toJs();
            const results_mae = results.map((arr) => arr[0]);
            const results_r2 = results.map((arr) => arr[1]);
            setResults([results_mae, results_r2])

            let flatData = [];
            globalThis.perFoldPreds.toJs().flatMap(subArray => {
                let anArray = []
                subArray[0].map((_, index) => {
                    anArray.push({ x: subArray[0][index], y: subArray[1][index] });
                });
                flatData.push(anArray);
            });
            setFoldState(flatData);
            setLoaded(true)
        } catch (e) {
            setErrors("Error in ML Model Training: " + e.message + "Most probably Pyodide has not loaded yet, please try in a few seconds. If you are adventurous you could always load up the console and observe the errors there :)")
            setLoaded(true)
        }
    }

    async function oneOffPred() {
        const mol_fp = fpSorter(
            localStorage.getItem("fingerprint"),
            oneOffSMILES,
            rdkit,
            parseInt(localStorage.getItem("path")),
            parseInt(localStorage.getItem("nBits")),
        )
        globalThis.one_off_mol_fp = [mol_fp];
        await pyodide.runPython(await (await fetch("/pyodide_ml_screen.py")).text());
        setOneOffSmilesResult((globalThis.one_off_y).toJs())
    }

    if (loaded) {
        return (
            <div className="tools-container">
                <details open={results.length == 0}>
                    <summary>Model Settings</summary>
                    <p style={{ margin: "10px 0" }}>If you are new to the world of ML, I'd suggest leaving these to the default and just press on
                        Run Model button down below. It'll generate you a report of the model performance. These parameters only help you control
                        the ML model performance and maybe tune it to your dataset. These default values have been tried and tested and should give you
                        decent performance.
                    </p>
                    {whatMLModel == "#rf" &&
                        <RF onSubmit={onSubmit} />
                    }

                    {whatMLModel == "#xgboost" &&
                        <XGB onSubmit={onSubmit} />
                    }
                </details>
                {results.length != 0 && <>
                    <GroupedBarChart mae={results[0]} r2={results[1]} />
                    <span>Mean MAE: {mean(results[0])}</span> &nbsp;
                    <span>Mean R-Squared: {mean(results[1])}</span>
                    <select className="input" onChange={(e) => setFoldNumSel(parseInt(e.target.value))}>
                        {foldState.map((_, i) => (
                            <option key={i} value={i}>Fold {i + 1}</option>
                        ))}
                    </select>
                    <Scatterplot data={foldState[foldNumSel]} xAxisTitle="Predicted Activity" yAxisTitle="Experimental" />
                    <hr></hr>
                    <details open>
                        <summary>Interpretation Guide</summary>
                        <p>The graph above is generated using K-Fold Validation. The dataset you have provided is split into 10 portion or folds.
                            One fold is kept for testing, while nine other folds are combined to train a model. This is repeated 10 times with each folds,
                            each fold is tested. This validation technique helps mitigate splitting biases.
                        </p>
                        <p>&emsp;Considering <a href="https://pubs.acs.org/doi/10.1021/ci400099q">the error rates in experimental assays and in general with ChEMBL</a>,
                            the mean absolute error (MAE) value of about 0.45 - 0.85 is a good ballpark range. Anything below 0.45 is low and possibly overfitting.
                            The R-squared value of near to one is desirable, but again given error rates, anything above 0.90ish is high.</p>
                        <p>&emsp;Now that you have an idea how the model performs, and how the training data looks like, this trained model could be used, to virtually screen
                            new molecules against your target. You could supply your own molecule using the CSV loader, or use ZINC (Both of these features are coming soon).
                            For now you could test one smile at a time.
                        </p>
                    </details>
                    <input className="input" onChange={(e) => setOneOffSmiles(e.target.value)} placeholder="Input Your SMILES string here"></input>
                    <button className="button" onClick={oneOffPred}>Predict Activity of SMILES</button>
                    <span>Predicted Activity: {oneOffSMILESResult}</span>
                </>}
            </div>
        )
    } else {
        return (
            <div className="tools-container">
                <Loader loadingText="Training and Testing the Model" />
            </div>
        )
    }
}