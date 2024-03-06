import { SubmitHandler } from "react-hook-form";
import CSVLoader, { Inputs } from "./CSVLoader";
import LoadFromWork from "./LoadFromWork";
import TargetGetter from "./TargetGetter";
import { useContext, useEffect, useState } from "react";
import LigandContext from "../../context/LigandContext";
import { useRouter } from "next/navigation";
import ErrorContext from "../../context/ErrorContext";
import ModalComponent from "../ui-comps/ModalComponent";

export default function DataLoader() {
    const { ligand, setLigand } = useContext(LigandContext);
    const router = useRouter();

    const { errors, setErrors } = useContext(ErrorContext);
    const [modalState, setModalState] = useState(false);    
  
    useEffect(() => {
      if (errors) {
        setModalState(true)
      }
    }, [errors])

    const onSubmit: SubmitHandler<Inputs> = (data) => {
        let while_process_var = ligand.map((x) => {
          x['id'] = x[data.id_column];
          x['activity_column'] = parseFloat(x[data.act_column || '']);
          x['canonical_smiles'] = x[data.smi_column];
          delete x[data.act_column || ''], x[data.id_column], x[data.smi_column];
          return x;
        });
        setLigand(while_process_var);
        localStorage.setItem('dataSource', 'csv');
        router.push('/tools/preprocess/');
    };

    return (
        <div className="data-loader-container">
            <div style  = {{width : "60%", margin : "0 auto"}}>
                <h2>Fetch the data</h2>
                <p>Starting off with analysis, we need data.
                    For now, you could use the in-built program to fetch data format
                    ChEMBL, or you can use your own dataset in a CSV format. If you are new here
                    and just want to try the program out, I'd suggest the ChEMBL program with the CHEMBL223 Target.
                    ChEMBL is a bioactivity database, and you could find details about it&nbsp;
                    <a href="https://www.ebi.ac.uk/chembl/" target="_blank" rel="noopener noreferrer">here</a>
                </p>
                <LoadFromWork />
            </div>
            <br />
            <div className="hehe-weird">
                <CSVLoader callofScreenFunction={onSubmit} csvSetter={setLigand} />
                <TargetGetter />
            </div>
            <ModalComponent isOpen={modalState} closeModal={() => {setModalState(false); setErrors("")}}>
              {errors}
            </ModalComponent>
        </div>
    )
}