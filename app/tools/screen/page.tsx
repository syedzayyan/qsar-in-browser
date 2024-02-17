"use client"

import { useContext, useState } from "react";
import { useForm } from 'react-hook-form';
import fpSorter from "../../../components/utils/fp_sorter";
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import Loader from "../../../components/ui-comps/Loader";
import ScreeningCompoundsLoader from "../../../components/dataloader/ScreeningCompoundsLoader";
import Histogram from "../../../components/tools/toolViz/Histogram";
import { MOEA } from "../../../components/utils/nsga2";
import { coverageNameSpace, coverageSets } from "../../../components/utils/coverage_score";
import { randomInt } from "mathjs";
import Table from "../../../components/ui-comps/PaginatedTables";
import ModalComponent from "../../../components/ui-comps/ModalComponent";

export default function Screen() {
    const [loaded, setLoaded] = useState(true);
    const [covLoad, setCovLoad] = useState(false);
    const [covLoadModal, setCovLoadModal] = useState(false)
    const [screenData, setScreenData] = useState([]);
    const [covSet, setCovSet] = useState([]);
    const { rdkit } = useContext(RDKitContext);
    const { pyodide } = useContext(PyodideContext);

    const [hof, setHOF] = useState<coverageSets[]>([{ id: "1", canonical_smiles: "CCO", fingerprint: [0, 0, 1], predictions: 0 }])

    const { register, handleSubmit } = useForm();

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

    function runCoverageScore(data) {
        setCovLoad(false);
        setCovLoadModal(true);
        setTimeout(async () => {
            const convertedArray: coverageSets[] = screenData.map((item) => ({
                id: item.id,
                canonical_smiles: item.canonical_smiles,
                fingerprint: item.fingerprint,
                predictions: item.predictions,
            }));

            function initIndividual(): number {
                return randomInt(0, convertedArray.length)
            }

            let covScore = await coverageNameSpace(convertedArray);

            let nsga2 = new MOEA.NSGA2(
                data.populationSize,
                data.objectiveSize,
                data.maxGenerations,
                data.crossoverRate,
                covScore.calculateCoverageScore,
                initIndividual
            );
            nsga2.mutationRate = data.mutationRate;
            nsga2.crossoverRate = data.crossoverRate;
            let pop = await nsga2.optimize();

            await setHOF(pop[0].chromosome.map(x => convertedArray[x]));
            setCovSet(pop);
            setCovLoad(true);
        }, 500)
    }

    if (!loaded) {
        return (
            <div className="tools-container">
                <Loader loadingText="Running ML Model on Ligands....." />
            </div>
        )
    }

    return (
        <div className="tools-container">
            <h2>This only works if you have trained your QSAR Model</h2>
            <br />
            <ScreeningCompoundsLoader
                callofScreenFunction={callofScreenFunction}
                setScreenData={setScreenData}
            />
            {screenData.length > 0 && (
                <>
                    {screenData[0].predictions != undefined &&
                        <>
                            <Histogram data={screenData.map(x => x.predictions)} width={600} height={600} />
                            <br />
                            <button className="button" onClick={downloadCsv}>
                                Download Predictions in CSV Format
                            </button>
                            &nbsp;
                            <button className="button" onClick={() => setCovLoadModal(true)}>Coverage Score</button>

                            <Table data={screenData} rowsPerPage={5} />
                            <ModalComponent isOpen={covLoadModal} closeModal={() => setCovLoadModal(false)} height="80" width="65">
                                <div>
                                    <form className="ml-forms" onSubmit={handleSubmit(runCoverageScore)} style={{ width: "45vw" }}>
                                        <label htmlFor="">Number of Compounds To Be Selected</label>
                                        <input defaultValue={10} className="input" type="number" {...register('numberOfCompounds', { required: true })} />
                                        <details>
                                            <summary>Advanced Settings</summary>
                                            <div className="ml-forms">
                                                <label htmlFor="">Population Size</label>
                                                <input defaultValue={20} className="input" type="number" {...register('populationSize', { required: true })} />

                                                <label htmlFor="">Objective Size</label>
                                                <input defaultValue={2} className="input" type="number" {...register('objectiveSize', { required: true })} />

                                                <label htmlFor="">Max Generations</label>
                                                <input defaultValue={100} className="input" type="number" {...register('maxGenerations', { required: true })} />

                                                <label htmlFor="">Mutation Rate</label>
                                                <input defaultValue={0.1} className="input" type="number" {...register('mutationRate', { required: true })} />

                                                <label htmlFor="">Crossover Rate</label>
                                                <input defaultValue={0.5} className="input" type="number" {...register('crossoverRate', { required: true })} />
                                            </div>
                                        </details>
                                        <input className="button" type="submit" value="Run GA Coverage" />
                                    </form>
                                    {hof.length > 1 && <Table data={hof} rowsPerPage={5} />}
                                </div>
                            </ModalComponent>
                        </>
                    }
                </>
            )}
        </div>
    )
}
