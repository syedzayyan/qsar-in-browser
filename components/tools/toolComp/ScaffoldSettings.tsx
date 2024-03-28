import { useForm } from "react-hook-form"
import RDKitContext from "../../../context/RDKitContext"
import { useContext } from "react"
import LigandContext from "../../../context/LigandContext"
import { scaffold_net_chunking_method } from "../../utils/rdkit_loader"
import loadGraphFromScaffNet from "../../utils/loadGraphFromScaffNet"

type ScaffoldNetParams = {
    includeGenericScaffolds: boolean
    includeGenericBondScaffolds: boolean
    includeScaffoldsWithoutAttachments: boolean
    includeScaffoldsWithAttachments: boolean
    keepOnlyFirstFragment: boolean
    pruneBeforeFragmenting: boolean
    flattenIsotopes: boolean
    flattenChirality: boolean
    flattenKeepLargest: boolean
    collectMolCounts: boolean
    bondBreakersRxns: string
}

export default function ScaffoldSettings({setGraph, setLoaded, activeTabChange}){
    const { rdkit } = useContext(RDKitContext);
    const { ligand } = useContext(LigandContext);
    const { register, handleSubmit, formState: { errors }, } = useForm<ScaffoldNetParams>();

    const onSubmit = (data: ScaffoldNetParams) => {
        setLoaded(false);
        try{
            let params = {
                includeGenericScaffolds: data.includeGenericScaffolds,
                includeGenericBondScaffolds: data.includeGenericBondScaffolds,
                includeScaffoldsWithoutAttachments: data.includeScaffoldsWithoutAttachments,
                includeScaffoldsWithAttachments: data.includeScaffoldsWithAttachments,
                keepOnlyFirstFragment: data.keepOnlyFirstFragment,
                pruneBeforeFragmenting: data.pruneBeforeFragmenting,
                flattenIsotopes: data.flattenIsotopes,
                flattenChirality: data.flattenChirality,
                flattenKeepLargest: data.flattenKeepLargest,
                collectMolCounts: data.collectMolCounts
            };
            if (data.bondBreakersRxns) {
                params["bondBreakersRxns"] = data.bondBreakersRxns;
            }     
            setTimeout(() => {
                let smiles_list = ligand.map((x) => x.canonical_smiles);
                const network = scaffold_net_chunking_method(smiles_list, 50, rdkit, params);
                const graph = loadGraphFromScaffNet(network, smiles_list, rdkit);  
                setGraph(graph);
                setLoaded(true);  
                activeTabChange(1);            
            }, 80);
        }catch(e){
            console.log(e);
        }
    }
    return (
        <div>
            <form className="ml-forms" onSubmit={handleSubmit(onSubmit)}>
                <label>
                    <input type="checkbox" name="includeGenericScaffolds" {...register("includeGenericScaffolds")} defaultChecked/>
                    includeGenericScaffolds
                </label>
                
                <label>
                    <input type="checkbox" name="includeGenericBondScaffolds" {...register("includeGenericBondScaffolds")}/>
                    includeGenericBondScaffolds
                </label>
                
                <label>
                    <input type="checkbox" name="includeScaffoldsWithoutAttachments" {...register("includeScaffoldsWithoutAttachments")} defaultChecked/>
                    includeScaffoldsWithoutAttachments
                </label>
                
                <label>
                    <input type="checkbox" name="includeScaffoldsWithAttachments" {...register("includeScaffoldsWithAttachments")} defaultChecked/>
                    includeScaffoldsWithAttachments
                </label>
                
                <label>
                    <input type="checkbox" name="keepOnlyFirstFragment" {...register("keepOnlyFirstFragment")} defaultChecked/>
                    keepOnlyFirstFragment
                </label>
                
                <label>
                    <input type="checkbox" name="pruneBeforeFragmenting" {...register("pruneBeforeFragmenting")} defaultChecked/>
                    pruneBeforeFragmenting
                </label>
                
                <label>
                    <input type="checkbox" name="flattenIsotopes" {...register("flattenIsotopes")} defaultChecked/>
                    flattenIsotopes
                </label>
                
                <label>
                    <input type="checkbox" name="flattenChirality" {...register("flattenChirality")} defaultChecked/>
                    flattenChirality
                </label>
                
                <label>
                    <input type="checkbox" name="flattenKeepLargest" {...register("flattenKeepLargest")} defaultChecked/>
                    flattenKeepLargest
                </label>
                
                <label>
                    <input type="checkbox" name="collectMolCounts" {...register("collectMolCounts")} defaultChecked/>
                    collectMolCounts
                </label>
                
                <label>
                    bondBreakersRxns &nbsp;
                    <input className = "input" type="text" name="bondBreakersRxns" {...register("bondBreakersRxns")}/>
                </label>

                <input type="submit" className = "button" value="Run Network"/>
            </form>
        </div>
    )
}
