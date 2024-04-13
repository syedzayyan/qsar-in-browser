"use client"

import { useContext, useState } from "react";
import PyodideContext from "../../../../context/PyodideContext";
import { MLResultsContext } from "../layout";
import RF from "../../../../components/ml-forms/RF";
import MLUtils from "../utils";
import Loader from "../../../../components/ui-comps/Loader";

export default function RandomForest() {
    const { pyodide } = useContext(PyodideContext);
    const setScreenData = useContext(MLResultsContext);

    const [loaded, setLoaded] = useState(true);
    globalThis.opts = 1;

    async function onSubmit(data) {
        setLoaded(false);
        globalThis.model_parameters = data;
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
            <h1>Random Forest</h1>
            <RF onSubmit={onSubmit}/>
        </div>
    )
}