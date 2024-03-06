"use client"
import { useContext, useState, createContext } from "react";
import fpSorter from "../../../components/utils/fp_sorter";
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import Loader from "../../../components/ui-comps/Loader";
import CSVLoader from "../../../components/dataloader/CSVLoader";

// Create a new context for screenData
export const ScreenDataContext = createContext([]);

export default function ScreenLayout({ children }) {
    const [loaded, setLoaded] = useState(true);
    const [screenData, setScreenData] = useState([]);

    const screenDataContextValue = screenData;

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
                    x["id"] = x[data.id_column]
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

    if (!loaded) {
        return (
            <div className="tools-container">
                <Loader loadingText="Running ML Model on Ligands....." />
            </div>
        )
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

    return (
        <div className="tools-container">
            <ScreenDataContext.Provider value={screenDataContextValue}>
                <div style = {{height : "20vh"}}>
                    <CSVLoader
                        callofScreenFunction={callofScreenFunction}
                        csvSetter={setScreenData}
                        act_col={false}
                    />                    
                </div>
                {screenData.length > 0 && children}
            </ScreenDataContext.Provider>
        </div>
    )
}
