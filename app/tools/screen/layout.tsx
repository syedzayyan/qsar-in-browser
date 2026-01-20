"use client"
import { useContext, useState, createContext } from "react";
import fpSorter from "../../../components/utils/fp_sorter";
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import Loader from "../../../components/ui-comps/Loader";
import CSVLoader from "../../../components/dataloader/CSVLoader";
import NotificationContext from "../../../context/NotificationContext";

// Create a new context for screenData
export const ScreenDataContext = createContext([]);

export default function ScreenLayout({ children }) {
    const [loaded, setLoaded] = useState(true);
    const [screenData, setScreenData] = useState([]);
    const { pushNotification } = useContext(NotificationContext);
    const screenDataContextValue = screenData;

    const { rdkit } = useContext(RDKitContext);
    const { pyodide } = useContext(PyodideContext);

    async function callofScreenFunction(data) {
        pushNotification({ message: "Running ML Model on Ligands" });
        let newScreenData = screenData
        newScreenData.forEach(obj => {
            obj["canonical_smiles"] = obj[data.smi_column];
            delete obj[data.smi_column];
        });

        const requestId = `fingerprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        rdkit.postMessage({
            function: 'only_fingerprint',
            id: requestId,
            mol_data: newScreenData,
            formStuff: {
                fingerprint: localStorage.getItem("fingerprint"),
                radius: parseInt(localStorage.getItem("path")),
                nBits: parseInt(localStorage.getItem("nBits")),
            }
        });
        rdkit.onmessage = async (event) => {
            console.log("Received message from RDKit:", event.data);
            if (event.data.id === requestId) {
                let mol_fp = event.data.data.map(x => x["fingerprint"]);
                pyodide.postMessage({
                    id: "job-123",
                    opts: 0,
                    fp: mol_fp,
                    func: "ml-screen"
                })
                pyodide.onmessage = async (event) => {
                    console.log("Received message from Pyodide:", event.data);
                    if (event.data.success == "ok") {
                        let fp_mols = event.data.results;
                        newScreenData = await newScreenData.map((x, i) => {
                            x["predictions"] = fp_mols[i];
                            return x
                        });
                        setScreenData(newScreenData);
                        pushNotification({ message: "ML Model run complete" });
                    }
                }
            }
        }
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
                <div style={{ height: "20vh" }}>
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
