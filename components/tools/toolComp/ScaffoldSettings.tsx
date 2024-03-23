import { useForm } from "react-hook-form"
import RDKitContext from "../../../context/RDKitContext"
import { useContext } from "react"

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

export default function ScaffoldSettings(){
    const { rdkit } = useContext(RDKitContext);
    const { register, handleSubmit, watch, formState: { errors }, } = useForm<ScaffoldNetParams>();

    const onSubmit = (data: ScaffoldNetParams) => {
        console.log(data);
        try{
            var scaffold_net_ins = new rdkit.ScaffoldNetwork();
            scaffold_net_ins.update_scaffold_params(true, true, true, true, true, true, true, true, true, true, []);
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
                    <input type="checkbox" name="includeGenericBondScaffolds" {...register("includeGenericBondScaffolds")} defaultChecked/>
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
