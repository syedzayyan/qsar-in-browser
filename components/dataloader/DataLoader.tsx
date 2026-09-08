import { SubmitHandler } from "react-hook-form";
import CSVLoader, { Inputs } from "./CSVLoader";
import LoadFromWork from "./LoadFromWork";
import TargetGetter from "./TargetGetter";
import PubChemLoader from "./PubChemLoader";
import { useContext, useEffect, useState } from "react";
import LigandContext from "../../context/LigandContext";
import { useRouter } from "next/navigation";
import ErrorContext from "../../context/ErrorContext";
import { Tabs, SegmentedControl } from '@mantine/core';
import SDFFileLoader from "./SDFFileLoader";
import TargetContext from "../../context/TargetContext";

export default function DataLoader() {
  const { ligand, setLigand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext)
  const router = useRouter();

  const { errors, setErrors } = useContext(ErrorContext);
  const [modalState, setModalState] = useState(false);
  const [curatedSource, setCuratedSource] = useState<"chembl" | "pubchem">("chembl");

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
    setTarget({ ...target, activity_columns: [data.act_column], data_source: "csv" })
    localStorage.setItem("dataSource", "csv");
    router.push("/tools/preprocess/");
  };

  return (
    <div className="tools-container">
      <div style={{ width: "80%", margin: "0 auto" }}>
        <h2>Load Small Molecule Data</h2>
        <p>
          QITB needs molecular structures and activity measurements to begin. Molecular 
          structures can be encoded as SMILES strings eg ('CCO' for ethanol) and activity 
          measurements can be any experimental or calculated measurement of interest for the 
          corresponding molecule - like binding affinity, assay potency etc. 
        </p>
        <p>
          If you are new to QSAR and cheminformatics, you can pick a protein target of interest
          from manually curated databases of small molecules -&nbsp;<a
            href="https://www.ebi.ac.uk/chembl/"
            target="_blank"
            rel="noopener noreferrer"
          >ChEMBL
          </a>
          &nbsp;or&nbsp;<a
            href="https://pubchem.ncbi.nlm.nih.gov/"
            target="_blank"
            rel="noopener noreferrer"
          >PubChem
          </a>
          . If you have small molecules you are interested in analysing, organise
          them into a CSV file with columns for 'ID', 'SMILES' and 'Activity' to
          analyse them with QITB.
        </p>
      </div>
      <br />
      <Tabs defaultValue="gallery">
        <Tabs.List>
          <Tabs.Tab value="gallery">
            Online Curated Data
          </Tabs.Tab>
          <Tabs.Tab value="messages" >
            Your Data
          </Tabs.Tab>
          <Tabs.Tab value="settings">
            Previous Session
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="gallery">
          <div style={{ width: "90%", margin: "20px auto 0" }}>
            <SegmentedControl
              fullWidth
              value={curatedSource}
              onChange={(v) => setCuratedSource(v as "chembl" | "pubchem")}
              data={[
                { label: "ChEMBL", value: "chembl" },
                { label: "PubChem", value: "pubchem" },
              ]}
            />
          </div>
          {curatedSource === "chembl" ? <TargetGetter /> : <PubChemLoader />}
        </Tabs.Panel>

        <Tabs.Panel value="messages">
          <CSVLoader callofScreenFunction={onSubmit} csvSetter={setLigand} />
        </Tabs.Panel>

        <Tabs.Panel value="settings">
          <LoadFromWork />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
