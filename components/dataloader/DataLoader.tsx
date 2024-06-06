import { SubmitHandler } from "react-hook-form";
import CSVLoader, { Inputs } from "./CSVLoader";
import LoadFromWork from "./LoadFromWork";
import TargetGetter from "./TargetGetter";
import { useContext, useEffect, useState } from "react";
import LigandContext from "../../context/LigandContext";
import { useRouter } from "next/navigation";
import ErrorContext from "../../context/ErrorContext";
import ModalComponent from "../ui-comps/ModalComponent";
import TabWrapper, { Tabs } from "../ui-comps/TabbedComponents";
import SDFFileLoader from "./SDFFileLoader";
import TargetContext from "../../context/TargetContext";

export default function DataLoader() {
  const { ligand, setLigand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext)
  const router = useRouter();

  const { errors, setErrors } = useContext(ErrorContext);
  const [modalState, setModalState] = useState(false);

  useEffect(() => {
    if (errors) {
      setModalState(true);
    }
  }, [errors]);

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    let while_process_var = ligand.map((x) => {
      x["id"] = x[data.id_column];
      x[data.act_column] = parseFloat(x[data.act_column || ""]);
      x["canonical_smiles"] = x[data.smi_column];
      x[data.id_column], x[data.smi_column];
      return x;
    });
    console.log(while_process_var)
    setLigand(while_process_var);
    setTarget({...target, activity_columns : [data.act_column], data_source: "csv"})
    localStorage.setItem("dataSource", "csv");
    router.push("/tools/preprocess/");
  };

  return (
    <div className="tools-container">
      <div style={{ width: "80%", margin: "0 auto" }}>
        <h2>Fetch the data</h2>
        <p>
          Starting off with analysis, we need data. For now, you could use the
          in-built program to fetch data format ChEMBL, or you can use your own
          dataset in a CSV format. If you are new here and just want to try the
          program out, I'd suggest the ChEMBL program with the CHEMBL223 Target.
          ChEMBL is a bioactivity database, and you could find details about
          it&nbsp;
          <a
            href="https://www.ebi.ac.uk/chembl/"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>
        </p>
      </div>
      <br />
      <div>
        <TabWrapper>
          <Tabs title="ChEMBL">
            <TargetGetter />
          </Tabs>
          <Tabs title="External File">
            <TabWrapper>
              <Tabs title="Upload CSV">
                <CSVLoader callofScreenFunction={onSubmit} csvSetter={setLigand} />
              </Tabs>
              <Tabs title="Upload SDF">
                <SDFFileLoader />
              </Tabs>
            </TabWrapper>
          </Tabs>
          <Tabs title="QITB JSON">
            <LoadFromWork />
          </Tabs>
        </TabWrapper>
      </div>
      <ModalComponent
        isOpen={modalState}
        closeModal={() => {
          setModalState(false);
          setErrors("");
        }}
      >
        {errors}
      </ModalComponent>
    </div>
  );
}
