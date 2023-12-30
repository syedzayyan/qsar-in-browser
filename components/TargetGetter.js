// TargetGetter.js
import React, { useContext, useEffect, useState } from "react";
import TargetContext from "../context/TargetContext";
import CompoundGetter from "./CompoundGetter";

export default function TargetGetter() {
  const [targetDetails, setTargetDetails] = useState([]);
  const { target, setTarget } = useContext(TargetContext);

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
      <label>
        Choose a Target From this List <br></br>
        <input
          className="input"
          placeholder="Start Typing and Things Will Come Up. Hopefully not PTSD"
          list="browsers"
          name="myBrowser"
          onChange={(e) => setTarget(e.target.value)}
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
    </div>
  );
}
