"use client"

import { createContext, useContext, useEffect, useState } from "react";
import GroupedBarChart from "../../../components/tools/toolViz/BarChart";
import Scatterplot from "../../../components/tools/toolViz/ScatterPlot";
import { round } from "mathjs";
import { mean } from "lodash";
import LigandContext from "../../../context/LigandContext";
import { usePathname } from "next/navigation";
import fpSorter from "../../../components/utils/fp_sorter";
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import TargetContext from "../../../context/TargetContext";

type dataChart = {
    x: number,
    y: number
}

export const MLResultsContext = createContext<React.Dispatch<React.SetStateAction<any[]>>>(null);

export default function MLLayout({ children }) {
    const [screenData, setScreenData] = useState([]);
    const [foldNumSel, setFoldNumSel] = useState(0);
    const [oneOffSMILES, setOneOffSmiles] = useState('CCO');
    const { rdkit } = useContext(RDKitContext);
    const { target } = useContext(TargetContext);
    const [oneOffSMILESResult, setOneOffSmilesResult] = useState<number>();
    const { pyodide } = useContext(PyodideContext);

    const { ligand } = useContext(LigandContext);

    globalThis.neg_log_activity_column = ligand.map((obj) => obj.neg_log_activity_column);
    globalThis.fp = ligand.map((obj) => obj.fingerprint);

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
            {screenData.length > 0 && (
                <>
                    <GroupedBarChart mae={screenData[0]} r2={screenData[1]}>
                        <span>Mean MAE: {round(mean(screenData[0]), 2)} || Mean R-Squared: {round(mean(screenData[1]), 2)}</span>
                    </GroupedBarChart>
                    <select className="input" onChange={(e) => setFoldNumSel(parseInt(e.target.value))}>
                        {screenData[2].map((_, i) => (
                            <option key={i} value={i}>Fold {i + 1}</option>
                        ))}
                    </select>
                    <Scatterplot data={screenData[2][foldNumSel]} xAxisTitle="Experimental Activity" yAxisTitle="Predicted Activity" />

                    <input className="input" onChange={(e) => setOneOffSmiles(e.target.value)} placeholder="Input Your SMILES string here"></input>
                    <button className="button" onClick={oneOffPred}>Predict Activity of SMILES</button>
                    <span>Predicted {target.activity_type}: {oneOffSMILESResult}</span>

                </>
            )}
        </div>
    )
}