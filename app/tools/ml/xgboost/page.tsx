"use client"

import { useContext, useState } from "react";
import PyodideContext from "../../../../context/PyodideContext";
import MLUtils from "../utils";
import Loader from "../../../../components/ui-comps/Loader";
import XGB from "../../../../components/ml-forms/XGB";
import { MLResultsContext } from "../../../../context/MLResultsContext";

export default function RandomForest() {
    const { pyodide } = useContext(PyodideContext);
    const setScreenData = useContext(MLResultsContext);

    const [loaded, setLoaded] = useState(true);
    globalThis.opts = 2;

    async function onSubmit(data) {
        setLoaded(false);
        globalThis.model_parameters = data;
        await pyodide.loadPackage(['xgboost']);
        await pyodide.runPython(await (await fetch("/pyodide_ml.py")).text());
        let results = MLUtils();
        setScreenData(results);
        setLoaded(true);
    }

    if (!loaded) {
        return <Loader />
    }
    return (
        <div>
            <h1>XGBoost</h1>
            <XGB onSubmit={onSubmit}/>
        </div>
    )
}