"use client"

import { useContext, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import DataTable from "../../../../components/ui-comps/PaginatedTables";
import { randomInt } from "mathjs";
import { MOEA } from "../../../../components/utils/nsga2";
import { coverageNameSpace, coverageSets } from "../../../../components/utils/coverage_score";
import { ScreenDataContext } from "../layout";
import RDKitContext from "../../../../context/RDKitContext";
import Loader from "../../../../components/ui-comps/Loader";
import fpSorter from "../../../../components/utils/fp_sorter";

export default function CovScore(){
    const [hof, setHOF] = useState<coverageSets[]>([{ id: "1", canonical_smiles: "CCO", fingerprint: [0, 0, 1], predictions: 0 }])
    const { register, handleSubmit, control } = useForm();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "inputs",
    });
    const {rdkit} = useContext(RDKitContext);

    const screenData = useContext(ScreenDataContext);

    const [covLoad, setCovLoad] = useState(true);
    const [covSet, setCovSet] = useState([]);

    const handleAddInput = (e) => {
        e.preventDefault();
        append({ id: "1", canonical_smiles: "CCO", fingerprint: [0, 0, 1], predictions: 0 });
    };

    function runCoverageScore(data) {
        const processedFingerprints = data.inputs.map((input) => {
            const modifiedFingerprint = fpSorter(
                localStorage.getItem("fingerprint"),
                input.canonical_smiles,
                rdkit,
                parseInt(localStorage.getItem("path")),
                parseInt(localStorage.getItem("nBits")),
            )
            return {
                ...input,
                fingerprint: modifiedFingerprint,
            };
        });

        setCovLoad(false);
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
            
            let covScore = await coverageNameSpace(convertedArray, processedFingerprints);


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

    if (!covLoad){
        return (
            <Loader />
        )
    }
    return(
        <div>
        <details>
            <summary>How to use this tool?</summary>
            <p>
                This part of the tool is used to select a subset of compounds from a larger set of compounds. 
                This larger set of compounds is usually a library of compounds that are available for screening, which you can upload.
                The subset of compounds is selected based on the coverage of the larger set of compounds or the coverage score.
                More about the coverage score is <a href = "https://pubs.acs.org/doi/full/10.1021/acs.jcim.2c00258#" target="_blank">explained here</a>.
                In essence, the score combined with a genetic algorithms helps to select a subset of compounds, that is diverse.
            </p>
            <p>
                The search for these can be directed and biased with pre-existing set of compounds dubbed the prior set.
                This will be helpful, if you already have a set of compounds that you know are active and you want to find
                similar-ish compounds but also sort of diverse enough.
            </p>   
            <p>
                The largest problem of this so-far is that the genetic algorithm is implemented in Javascript and I don't know
                enough about NSGA2 or JS to make it multithreaded. TLDR: It's slow.
            </p> 
        </details>
        <form className="ml-forms" onSubmit={handleSubmit(runCoverageScore)} style={{ width: "100%" }}>
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
            <div style={{width : "100%"}}>
                {fields.map((field, index) => (
                    <div key={field.id} className="ml-forms zone">
                        <label>SMILES</label>
                        <input
                            className="input"
                            type="text"
                            {...register(`inputs.${index}.canonical_smiles`)}
                        />
                        <label>Activity</label>
                        <input
                            className="input"
                            type="number"
                            {...register(`inputs.${index}.predictions`)}
                        />
                        <button onClick={() => remove(index)} className="button">Remove</button>
                    </div>
                ))}
            </div>
            <button onClick={handleAddInput} className="button">Add Prior SMILES</button>
        </form>
        {hof.length > 1 && <DataTable data={hof} rowsPerPage={5} onSelectionChange={() => {}} />}
    </div>
    )
}