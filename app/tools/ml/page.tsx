"use client"

import { useContext, useEffect, useRef, useState } from "react"
import LigandContext from "../../../context/LigandContext"
import PyodideContext from "../../../context/PyodideContext";
import { useSearchParams } from "next/navigation";
import Loader from "../../../components/ui-comps/Loader";
import RDKitContext from "../../../context/RDKitContext";
import { useForm } from "react-hook-form";
import GroupedBarChart from "../../../components/tools/toolViz/BarChart";
import { mean } from "mathjs";
import bitStringToBitVector from "../../../components/utils/bit_vect";

type RFModelInputs = {
    n_estimators: number,
    criterion: string,
    max_features : string,
    n_jobs : number,
}

type XGBoostModelInputs = {
    max_depth: number,
    min_child_weight: number,
    subsample : number,
    colsample_bytree : number,
    learning_rate : number,
    n_jobs : number
}

export default function ML(){

    const {ligand} = useContext(LigandContext);
    const { pyodide } = useContext(PyodideContext);
    const { rdkit } = useContext(RDKitContext);
    const [whatMLModel, setWhatMLModel] = useState('');
    const [results, setResults] = useState([]);
    const [oneOffSMILES, setOneOffSmiles] = useState('CCO');
    const [oneOffSMILESResult, setOneOffSmilesResult] = useState<number>();


    const [loaded, setLoaded] = useState(true);

    const { register, handleSubmit, watch, formState: { errors }, } = useForm<RFModelInputs>()
    const { register : register2, handleSubmit: handleSubmit2, 
        watch: watch2, formState: { errors: errors2 }, } = useForm<XGBoostModelInputs>()

    useEffect(() => {
        setWhatMLModel(window.location.hash);
        setResults([]);
    }, [useSearchParams()]);

    async function onSubmit(data){
        if (whatMLModel == "#rf"){
            globalThis.opts = 1;
        } else if (whatMLModel == "#xgboost") {
            globalThis.opts = 2;
            await pyodide.loadPackage(['xgboost']);
        } else {
            globalThis.opts = 3
        }


        setLoaded(false)
        globalThis.model_parameters = data;

        globalThis.pKi = ligand.map((obj) => obj.pKi);
        globalThis.fp = ligand.map((obj) => obj.fingerprint);

        await pyodide.runPython(await (await fetch("/pyodide_ml.py")).text());

        const results = globalThis.metrics.toJs();
        const results_mae = results.map((arr) => arr[0]);
        const results_r2 = results.map((arr) => arr[1]);
        setResults([results_mae, results_r2])

        setLoaded(true)
    }

    async function oneOffPred(){
        const mol = rdkit.get_mol(oneOffSMILES);
        let mol_fp = mol.get_morgan_fp(JSON.stringify({ radius: 2, nBits: 2048 }));
        mol_fp = bitStringToBitVector(mol_fp);
        mol.delete();
        globalThis.one_off_mol_fp = [mol_fp];
        await pyodide.runPython(await (await fetch("/pyodide_ml_screen.py")).text());
        setOneOffSmilesResult((globalThis.one_off_y).toJs())
    }

    if (loaded) {
        return(
            <div className="tools-container">
                <details open = {results.length == 0}>
                    <summary>Model Settings</summary>
                    <p style = {{margin : "10px 0"}}>If you are confused, I'd suggest leaving these to the default and just press on 
                        Run Model button down below. It'll generate you a report of the model performance. These parameters only help you control
                        the ML model performance and maybe tune it to your dataset. These default values have been tried and tested and should give you
                        decent performance.
                    </p>
                    {whatMLModel == "#rf" && 
                    <form className="ml-forms" onSubmit={handleSubmit(onSubmit)}>
                        <p>The Python Scikit Learn with the Random Forest Regressor is used. You could consult those docs
                            for clarity
                        </p>
                        <label className="form-labels" htmlFor="n_estimators">Number of Estimators: &nbsp;</label>
                        <input id = "n_estimators" className="input" type="number" defaultValue={120} {...register("n_estimators")} />
                        <br />
                        <label className="form-labels" htmlFor="criterion">Criterion: &nbsp;</label>
                        <select id = "criterion" className="input" defaultValue={1} {...register("criterion", { required: true })}>
                            <option value = "squared_error">squared_error</option>
                            <option value = "absolute_error">absolute_error</option>
                            <option value = "friedman_mse">friedman_mse</option>
                            <option value = "poisson">poisson</option>
                        </select>
                        <br />
                        <label className="form-labels" htmlFor="max_features">Maximum Features: &nbsp;</label>
                        <select id = "max_features" className="input" defaultValue={1} {...register("max_features", { required: true })}>
                            <option value = "sqrt">sqrt</option>
                            <option value = "log2">log2</option>
                            <option value = "None">None</option>
                        </select>
                        <br />
                        <label className="form-labels" htmlFor="n_jobs">Number of CPUs: &nbsp;</label>
                        <input id = "n_jobs" className="input" type="number" defaultValue={2} {...register("n_jobs", { required: true })} />
                        <br />
                        <br />
                        <input value={"Train and Test RF Model"} className="button"type="submit" />
                    </form>
                    }

                    {whatMLModel == "#xgboost" && 
                    <form className="ml-forms" onSubmit={handleSubmit2(onSubmit)}>
                        <p>The python XGBoost library is used. You could consult those docs
                            for clarity
                        </p>
                        <label className="form-labels" htmlFor="learning_rate">Learning Rate: &nbsp;</label>
                        <input className="input" id = "learning_rate" type="number" defaultValue={0.15} {...register2("learning_rate")} />
                        <br />
                        <label className="form-labels" htmlFor="max_depth">Maximum Depth: &nbsp;</label>
                        <input className="input" id = "max_depth" type="number" defaultValue={8} {...register2("max_depth")} />
                        <br />
                        <label className="form-labels" htmlFor="min_child_weight">Minimum Child Weight: &nbsp;</label>
                        <input className="input" id = "min_child_weight" type="number" defaultValue={7} {...register2("min_child_weight")} />
                        <br />
                        <label className="form-labels" htmlFor="subsample">Subsample: &nbsp;</label>
                        <input className="input" id = "subsample" type="number" defaultValue={1} {...register2("subsample")} />
                        <br />
                        <label className="form-labels" htmlFor="colsample_bytree">colsample_bytree: &nbsp;</label>
                        <input className="input" id = "colsample_bytree" type="number" defaultValue={1} {...register2("colsample_bytree")} />
                        <br />
                        <label className="form-labels" htmlFor="n_jobs">Number of CPUs: &nbsp;</label>
                        <input className="input" id = "n_jobs" type="number" defaultValue={2} {...register2("n_jobs", { required: true })} />
                        <br />
                        <br />
                        <input value={"Train and Test XGBoost Model"} className="button"type="submit" />
                    </form>
                    }
                </details>
                {results.length != 0 && <>
                    <GroupedBarChart mae = {results[0]} r2={results[1]}/>
                    <span>Mean MAE: {mean(results[0])}</span> &nbsp;
                    <span>Mean R-Squared: {mean(results[1])}</span>
                    <hr></hr>
                    <details open>
                        <summary>Interpretation Guide</summary>
                            <p>The graph above is generated using K-Fold Validation. The dataset you have provided is split into 10 portion or folds.
                                One fold is kept for testing, while nine other folds are combined to train a model. This is repeated 10 times with each folds,
                                each fold is tested. This validation technique helps mitigate splitting biases.
                            </p>
                            <p>&emsp;Considering <a href = "https://pubs.acs.org/doi/10.1021/ci400099q">the error rates in experimental assays and in general with ChEMBL</a>,
                            the mean absolute error (MAE) value of about 0.45 - 0.85 is a good ballpark range. Anything below 0.45 is freakishly low and possibly overfitting.
                            The R-squared value of near to one is desirable, but again given error rates, anything above 0.90ish is freakishly high.</p>
                            <p>&emsp;Now that you have an idea how the model performs, and how the training data looks like, this trained model could be used, to virtually screen
                                new molecules against your target. You could supply your own molecule using the CSV loader, or use ZINC (Both of these features are coming soon).
                                For now you could test one smile at a time.
                            </p>
                    </details>
                    <input className="input" onChange={(e) => setOneOffSmiles(e.target.value)} placeholder="Input Your SMILES string here"></input>
                    <button className="button" onClick={oneOffPred}>Predict Activity of SMILES</button>
                    <p>Predicted pKi: {oneOffSMILESResult}</p>
                </>}
            </div>
        )        
    } else {
        return (
            <div className="tools-container">
                <Loader loadingText="Training and Testing the Model"/>
            </div>
        )
    }
}