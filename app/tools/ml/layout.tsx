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
import { Button, Group, Input } from "@mantine/core";

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
        const requestId = `fingerprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        rdkit.postMessage({
          function: 'fingerprint',
          id: requestId,
          mol_data: [{
            "canonical_smiles" : oneOffSMILES
          }],
          activity_columns: target.activity_columns,
          formStuff: {
            fingerprint: localStorage.getItem("fingerprint"),
            radius: parseInt(localStorage.getItem("path")),
            nBits: parseInt(localStorage.getItem("nBits")),
        }
        });
        rdkit.onmessage = async (event) => {
            if (event.data.id === requestId) {
                let mol_fp = event.data.data[0]["fingerprint"];
                pyodide.postMessage({
                    id: "job-123",
                    opts: 0,
                    fp: [mol_fp],
                    func: "ml-screen"
                })
                pyodide.onmessage = (event) => {
                    if (event.data.success == "ok") {
                        setOneOffSmilesResult(event.data.results[0]);
                    }
                }
            }
        }
    }

    return (
        <div className="tools-container">
            <MLResultsContext.Provider value={setScreenData}>
                {children}
            </MLResultsContext.Provider>
            {target.machine_learning.length > 0 && (
                <>
                    &nbsp;
                    <Group>
                        <h2>Predict the activity of a single molecule</h2>
                        <Input ref={inputRef} style={{ width: "20%" }} className="input" onChange={(e) => setOneOffSmiles(e.target.value)} placeholder="Input Your SMILES string here"></Input>
                        <Dropdown buttonText="Draw the molecule">
                            <JSME width="300px" height="300px" onChange={(smiles) => setOneOffSmiles(smiles)} />
                        </Dropdown>
                        <Button className="button" onClick={oneOffPred}>Predict Activity of SMILES</Button>
                        <span>Predicted {target.activity_columns[0]}: {oneOffSMILESResult}</span>
                    </Group>

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