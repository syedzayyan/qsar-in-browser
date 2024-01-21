// TargetGetter.js
import React, { useContext, useEffect, useState } from "react";
import TargetContext from "../context/TargetContext";
import CompoundGetter from "./CompoundGetter";
import LigandContext from "../context/LigandContext";
import DataPreProcessToolKit from './DataPreProcessToolKit';

export default function TargetGetter() {
  const [targetDetails, setTargetDetails] = useState([]);
  const { target, setTarget } = useContext(TargetContext);
  const { ligand } = useContext(LigandContext);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetch(`https://www.ebi.ac.uk/chembl/api/data/target/search?format=json&q=${target}`)
        .then((response) => response.json())
        .then((data) => {
          let target_data = data.targets;
          setTargetDetails(target_data);
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }, 100);

    return () => clearTimeout(delayDebounceFn);
  }, [target]);

  return (
    <div className="container">
      {ligand >= 0 ? (
        <div>
          <h4>Download the data from ChEMBL</h4>
          <label>
            <input
              className="input"
              placeholder="Search for relevant words to your Target"
              list="browsers"
              name="myBrowser"
              onChange={(e) => ssetTarget(e.target.value)}
            />
          </label>
          <datalist id="browsers">
            {targetDetails &&
              targetDetails.map((tars) => (
                <option key={tars.target_chembl_id} value={tars.target_chembl_id}>
                  {tars.pref_name} || {tars.target_chembl_id} || {tars.organism}
                </option>
              ))}
          </datalist>
          <CompoundGetter />
          <hr></hr>
        </div>
      ) : (
        <DataPreProcessToolKit />
      )
      }
    </div>
  );
}
