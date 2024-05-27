import React, { useContext, useState } from 'react';
import { useForm } from "react-hook-form";
import FAQComp from '../ui-comps/FAQComp';
import molDataCleanUp from '../utils/mol_cleanup';
import LigandContext from '../../context/LigandContext';
import RDKitContext from '../../context/RDKitContext';
import Loader from '../ui-comps/Loader';
import { useRouter } from 'next/navigation';
import TargetContext from '../../context/TargetContext';

type FingerPrintSettings = {
  fingerprint: "maccs" | "morgan" | "rdkit_fp",
  radius?: number,
  nBits?: number,
  dedup: boolean,
  log10: boolean,
}

const DataPreProcessToolKit = () => {
  const [loaded, setLoaded] = useState(true);
  const [stage, setStage] = useState('choose'); // Initial stage is 'choose'
  const [selection, setSelection] = useState('express');
  const { ligand, setLigand } = useContext(LigandContext);
  const { rdkit } = useContext(RDKitContext);
  const { target, setTarget } = useContext(TargetContext);

  const [advancedSelection, setAdvancedSelection] = useState(null);
  const { register, handleSubmit, watch, formState: { errors }, } = useForm<FingerPrintSettings>();
  const fpOption = watch("fingerprint");

  const router = useRouter();

  const handleChooseSubmit = (e) => {
    e.preventDefault();
    if (selection === 'express') {
      setLoaded(false);
      setTimeout(async () => {
        var lig_data = await molDataCleanUp(rdkit, ligand, target.activity_columns); 
        setLigand(lig_data[0]);
        setTarget({...target, activity_columns: lig_data[1], pre_processed : true});
        setLoaded(true);
        router.push('/tools/activity');
      }, 100);
    } else if (selection === 'advanced') {
      setStage('advanced');
    }
  };

  const handleBack = () => {
    setStage('choose');
    setAdvancedSelection(null); // Optionally reset advanced selection
  };

  const dataProcessor = (formStuff) => {
    setLoaded(false);
    setTimeout(async () => {
      let lig_data = await molDataCleanUp(
      rdkit, 
      ligand, 
      target.activity_columns,
      formStuff
    );
    setLigand(lig_data[0]);
    setTarget({...target, activity_columns: lig_data[1], pre_processed : true});
    setLoaded(true);
  }, 100)
    setLoaded(false);
    router.push('/tools/activity');
  }

  if (!loaded){
    return(
      <Loader loadingText='Processing Molecules'/>
    )
  }

  return (
    <div>
      <FAQComp>
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
      </FAQComp>
      {stage === 'choose' && (
        <form onSubmit={handleChooseSubmit}>
          <h1>Pre-Processing Molecules</h1>

          <label className='custom-label'>
            <input
              type="radio"
              name="setting"
              value="express"
              className='custom-radio'
              onChange={(e) => setSelection(e.target.value)}
              defaultChecked = {true}
            />
            Express
          </label>
          <br />
          <label className='custom-label'>
            <input
              type="radio"
              name="setting"
              value="advanced"
              className='custom-radio'
              onChange={(e) => setSelection(e.target.value)}
            />
            Advanced
          </label>
          <br />
          <button type="submit" disabled={!selection} className='button'>Submit</button>
        </form>
      )}
      {stage === 'advanced' && (
        <div>
          <button className='button' type="button" onClick={handleBack}>←</button>
          <form onSubmit={handleSubmit(dataProcessor)}>
            <label className="form-labels" htmlFor="fingerprint">Fingerprint Type: &nbsp;</label><br />
            <select id="fingerprint" className="input" {...register("fingerprint")} style={{ width: "40%" }}>
              <option value="maccs">MACCS Fingerprint</option>
              <option value="morgan">Morgan Fingerprint</option>
              <option value="rdkit_fp">RDKit Fingerprint</option>
            </select>
            <br />
            {fpOption === "morgan" || fpOption === "rdkit_fp" ?
              <div className="ml-forms">
                <label>Radius Size: </label>
                <input className="input" type="number" defaultValue={2} {...register("radius")}></input>
                <label>Fingerprint Size: </label>
                <input className="input" type="number" defaultValue={2048} {...register("nBits")}></input>
              </div> : null}
            <br />
            <input className='radio-buttons' type="checkbox" defaultChecked={true} {...register("dedup")}></input>
            <label>Data De-Duplication (By ID Column)</label>
            <br />
            <input type="checkbox" defaultChecked={true} {...register("log10")}></input>
            <label>Convert to negative logarithm (base 10)</label>
            <br />
            <input type="submit" className="button" value="Process Molecule"></input>
          </form>

        </div>
      )}
    </div>
  );
};

export default DataPreProcessToolKit;
