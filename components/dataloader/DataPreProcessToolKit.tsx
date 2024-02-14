import { useContext, useState } from "react";
import LigandContext from "../../context/LigandContext";
import Loader from '../ui-comps/Loader';
import { useRouter } from 'next/navigation';
import RDKitContext from "../../context/RDKitContext";

import { useForm } from "react-hook-form";
import fpSorter from "../utils/fp_sorter";

type FingerPrintSettings = {
  fingerprint: "maccs" | "morgan" | "rdkit_fp",
  radius?: number,
  nBits?: number,
  dedup: boolean,
}


export default function DataPreProcessToolKit() {
  const router = useRouter();
  const { register, handleSubmit, watch, formState: { errors }, } = useForm<FingerPrintSettings>();
  const fpOption = watch("fingerprint");
  const { ligand, setLigand } = useContext(LigandContext);
  const { rdkit } = useContext(RDKitContext)
  const [loaded, setLoaded] = useState(true);

  function dataProcessor(formStuff) {
    setLoaded(false);
    localStorage.setItem("fingerprint", formStuff.fingerprint);
    localStorage.setItem("path", formStuff.radius);
    localStorage.setItem("nBits", formStuff.nBits);
    setTimeout(async () => {
      var de_dup_lig = ligand.map(({ id, canonical_smiles, activity_column }) => {
        return {
          id,
          canonical_smiles,
          activity_column,
          ["neg_log_activity_column"]: window.location.hash === "#chembl" ? -Math.log10(activity_column * 10e-9).toFixed(2) : activity_column,
        };
      })

      if (formStuff.dedup) {
        de_dup_lig = await de_dup_lig.filter((ligand, index, self) =>
          index === self.findIndex((t) => (
            t.id === ligand.id &&
            t.canonical_smiles === ligand.canonical_smiles && 
            ligand.activity_column
          )));
      }

      await de_dup_lig.map((lig, i) => {
        try {
          const mol_fp = fpSorter(
            formStuff.fingerprint,
            lig.canonical_smiles,
            rdkit,
            formStuff.radius,
            formStuff.nBits
          )
          de_dup_lig[i]['fingerprint'] = mol_fp;
        } catch (e) {
          console.error(e);
        }
      })


      setLigand(de_dup_lig);
      console.log(ligand)
      router.push('/tools/activity');
    }, 500)
  }



  if (loaded) {
    return (
      <div>
        <h1>Data Pre-Processing</h1>
        <details open={false}>
          <summary>What does this even mean?</summary>
          <p>In order for small molecules to be visualised, compounds need to be converted into something called a fingerprint.
            A collection of 0s and 1s that denote and absences and presences of chemical motifs or environments. This is purely,
            because computer have no idea what chemistry is and only understand binary. Naturally, many different types of fingerprints
            have been developed over the years. In this web app, three are included. Each have their own strengths but for for all things
            Machine Learning, the Morgan Fingerprint is superior (usually) and is kept the default
          </p>
          <p>
            &emsp; If you have downloaded data from ChEMBL, there are duplicates. Additionally, your standard assay unit of
            Ki, EC50 etc is easier to visualise and manage when converted to logarithm. However, you might prefer raw Ki, EC50 values, thus the options
            to not convert to logarithm values.
          </p>
        </details>
        <br></br>
        <form onSubmit={handleSubmit(dataProcessor)}>
          <label className="form-labels" htmlFor="fingerprint">Fingerprint Type: &nbsp;</label><br />
          <select id="fingerprint" className="input" {...register("fingerprint")}>
            <option value="maccs">MACCS Fingerprint</option>
            <option value="morgan">Morgan Fingerprint</option>
            <option value="rdkit_fp">RDKit Fingerprint</option>
          </select>
          <br />
          {fpOption === "morgan" || fpOption === "rdkit_fp" ?
            <div className="ml-forms">
              <label>Radius Size: </label>
              <input className="input" type="number" defaultValue={2}></input>
              <label>Fingerprint Size: </label>
              <input className="input" type="number" defaultValue={2048}></input>
            </div> : null}
          <br />
          <input type="checkbox" defaultChecked={true} {...register("dedup")}></input>
          <label>Data De-Duplication</label>
          <br />
          <input type="submit" className="button" value="Process Molecule"></input>
        </form>
        <br />
      </div>
    )
  } else {
    return (
      <div>
        <Loader loadingText="Processing Molecules" />
      </div>
    )
  }
}
