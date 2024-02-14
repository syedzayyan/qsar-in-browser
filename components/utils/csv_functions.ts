import { useContext } from "react";
import { SubmitHandler } from "react-hook-form";
import LigandContext from "../../context/LigandContext";
import { useRouter } from "next/navigation";
import { Inputs } from "../dataloader/CSVLoader";


export function handleSubmitCSV(data: SubmitHandler<Inputs>){
    const {ligand, setLigand} = useContext(LigandContext);
    const router = useRouter();


    let while_process_var = ligand;
    while_process_var.map(x => {
      x["id"] = x[data.id_column];
      x["activity_column"] = x[data.act_column];
      x["canonical_smiles"] = x[data.smi_column];
      delete data.act_column;
      return x
    })
    setLigand(while_process_var);
    router.push('/tools/preprocess')
};

