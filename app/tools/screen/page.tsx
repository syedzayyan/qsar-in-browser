"use client"

import { useContext, useState } from "react";
import fpSorter from "../../../components/utils/fp_sorter";
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import Loader from "../../../components/ui-comps/Loader";
import ScreeningCompoundsLoader from "../../../components/dataloader/ScreeningCompoundsLoader";
import Histogram from "../../../components/tools/toolViz/Histogram";

export default function Screen() {
    const [loaded, setLoaded] = useState(true);
    const [screenData, setScreenData] = useState([]);
    const { rdkit } = useContext(RDKitContext);
    const { pyodide } = useContext(PyodideContext);

    async function callofScreenFunction(data) {
        setLoaded(false);
        setTimeout(async () => {
            const fp_mols = await screenData.map((x) => {
                try {
                    x["fingerprint"] = fpSorter(
                        localStorage.getItem("fingerprint"),
                        x[data.smi_column],
                        rdkit,
                        parseInt(localStorage.getItem("path")),
                        parseInt(localStorage.getItem("nBits")),
                    )
                    x["id"] = data.id_column
                    return x
                } catch (error) {
                    console.error("Error processing element:", error);
                    return null;
                }
            }).filter((x) => x !== null);

            globalThis.one_off_mol_fp = fp_mols.map(x => x.fingerprint);
            await pyodide.runPython(await (await fetch("/pyodide_ml_screen.py")).text());
            let tempVar = (globalThis.one_off_y).toJs();
            tempVar = await fp_mols.map((x, i) => {
                x["predictions"] = tempVar[i];
                return x
            });
            await setScreenData(tempVar);
            setLoaded(true);
        }, 500)
    }
    const downloadCsv = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            screenData.map(row => Object.values(row).join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!loaded) {
        return (
            <div className="tools-container">
                <Loader />
            </div>
        )
    }
    return (
        <div className="tools-container">
            <h2>This only works if you have trained your QSAR Model</h2>
            <ScreeningCompoundsLoader
                callofScreenFunction={callofScreenFunction}
                setScreenData={setScreenData}
            />
            {screenData.length > 0 && (
                <>
                    {screenData[0].predictions != undefined &&
                        <>
                            <Histogram data={screenData.map(x => x.predictions)} width={600} height={600} />
                            <button className="button" onClick={downloadCsv}>
                                Download Predictions in CSV Format
                            </button>
                        </>
                    }
                </>
            )}
        </div>
    )
}