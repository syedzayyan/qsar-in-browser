"use client"

import { useContext, useEffect, useRef, useState } from "react"
import LigandContext from "../../../context/LigandContext"
import PyodideContext from "../../../context/PyodideContext";
import { useSearchParams } from "next/navigation";
import Loader from "../../../components/ui-comps/Loader";
import RDKitContext from "../../../context/RDKitContext";
import { useForm, SubmitHandler } from "react-hook-form";
import GroupedBarChart from "../../../components/tools/toolViz/BarChart";


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
    const [results, setResults] = useState([])

    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

    const [loaded, setLoaded] = useState(true);

    const { register, handleSubmit, watch, formState: { errors }, } = useForm<RFModelInputs>()
    const { register : register2, handleSubmit: handleSubmit2, 
        watch: watch2, formState: { errors: errors2 }, } = useForm<XGBoostModelInputs>()

    useEffect(() => {
        setWhatMLModel(window.location.hash);
    }, [useSearchParams()]);

    async function onSubmit(data){
        console.log(data)
        setLoaded(false)
        globalThis.model_parameters = data;

        globalThis.pKi = ligand.map((obj) => obj.pKi);
        globalThis.fp = ligand.map((obj) => obj.fingerprint);

        if (whatMLModel == "#rf"){
            globalThis.opts = 1;
        } else if (whatMLModel == "#xgboost") {
            await pyodide.loadPackage(['xgboost'])
            globalThis.opts = 2
        } else {
            globalThis.opts = 3
        }

        await pyodide.runPython(await (await fetch("/pyodide_ml.py")).text());

        const results = globalThis.metrics.toJs();
        const results_mae = results.map((arr) => arr[0]);
        const results_r2 = results.map((arr) => arr[1]);
        setResults([results_mae, results_r2])

        setLoaded(true)
    }

    if (loaded) {
        return(
            <div className="tools-container" ref={containerRef}>
                <details open = {results.length == 0}>
                    <summary>Model Settings</summary>
                    <p style = {{margin : "10px 0"}}>If you are confused, I'd suggest leaving these to the default and just press on 
                        Run Model button down below. It'll generate you a report of the model performance.
                    </p>
                    {whatMLModel == "#rf" && 
                    <form onSubmit={handleSubmit(onSubmit)}>
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
                    <form onSubmit={handleSubmit2(onSubmit)}>
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
                {results.length != 0 && <GroupedBarChart mae = {results[0]} r2={results[1]}/>}
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