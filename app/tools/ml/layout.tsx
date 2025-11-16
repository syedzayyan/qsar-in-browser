"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react";
import GroupedBarChart from "../../../components/tools/toolViz/BarChart";
import Scatterplot from "../../../components/tools/toolViz/ScatterPlot";
import { round } from "mathjs";
import { mean } from "lodash";
import { usePathname } from "next/navigation";
import fpSorter from "../../../components/utils/fp_sorter";
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import TargetContext from "../../../context/TargetContext";
import { MLResultsContext } from "../../../context/MLResultsContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../components/tools/toolViz/DropDown";

type dataChart = {
    x: number,
    y: number
}

export default function MLLayout({ children }) {
    const [screenData, setScreenData] = useState([]);
    const [foldNumSel, setFoldNumSel] = useState(0);
    const [oneOffSMILES, setOneOffSmiles] = useState('CCO');
    const { rdkit } = useContext(RDKitContext);
    const { target } = useContext(TargetContext);
    const [oneOffSMILESResult, setOneOffSmilesResult] = useState<number>();
    const { pyodide } = useContext(PyodideContext);

    const inputRef = useRef(null);
    useEffect(() => {
        if (inputRef.current) {
          inputRef.current.value = oneOffSMILES;
        }
      }, [oneOffSMILES]);

    useEffect(() => {
        setScreenData([]);
    }, [usePathname()])


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

    return (
        <div className="tools-container">
            <MLResultsContext.Provider value={setScreenData}>
                {children}
            </MLResultsContext.Provider>
            {target.machine_learning.length > 0 && (
                <>
                    &nbsp;
                    <div style={{ borderColor: "10px solid black", margin: "20px 0", gap: "10px" }}>
                        <h2>Predict the activity of a single molecule</h2>
                        <input ref={inputRef} style={{ width: "40%" }} className="input" onChange={(e) => setOneOffSmiles(e.target.value)} placeholder="Input Your SMILES string here"></input>
                        <br />
                        <Dropdown buttonText="Draw the molecule">
                            <JSME width="300px" height="300px" onChange={(smiles) => setOneOffSmiles(smiles)} />
                        </Dropdown>
                        <br />
                        <button className="button" onClick={oneOffPred}>Predict Activity of SMILES</button>
                        <br />
                        <span>Predicted {target.activity_columns[0]}: {oneOffSMILESResult}</span>
                    </div>

                    <GroupedBarChart mae={target.machine_learning[0]} r2={target.machine_learning[1]}>
                        <span>Mean MAE: {round(mean(target.machine_learning[0]), 2)} || Mean R-Squared: {round(mean(target.machine_learning[1]), 2)}</span>
                    </GroupedBarChart>
                    <select className="input" onChange={(e) => setFoldNumSel(parseInt(e.target.value))}>
                        {target.machine_learning[2].map((_, i) => (
                            <option key={i} value={i}>Fold {i + 1}</option>
                        ))}
                    </select>
                    <Scatterplot data={target.machine_learning[2][foldNumSel]} xAxisTitle="Experimental Activity" yAxisTitle="Predicted Activity" />
                </>
            )}
        </div>
    )
}