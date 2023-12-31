import React, { useContext, useState } from "react";
import TargetContext from "../context/TargetContext";
import LigandContext from "../context/LigandContext";
import Link from "next/link";

export default function CompoundGetter() {
  const [unit, setUnit] = useState("Ki");
  const [binding, setBinding] = useState("B");
  const { target, _ } = useContext(TargetContext);
  const { ligand, setLigand } = useContext(LigandContext);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function getFullActivityData(url) {
    setLoading(true);

    const chembl_url = "https://www.ebi.ac.uk";
    const results = [{}];

    let nextUrl = chembl_url + url;

    while (nextUrl !== chembl_url + "null") {
      const response = await fetch(nextUrl);
      const data = await response.json();
      results.push(...data.activities);

      nextUrl = chembl_url + data.page_meta.next;

      const newProgress =
        (results.length / data.page_meta.total_count) * 100;
      setProgress(newProgress);
    }

    return results.slice(1);
  }

  function hehe() {
    getFullActivityData(
      `/chembl/api/data/activity?format=json&target_chembl_id=${target}&type=${unit}&target_organism=Homo%20sapiens&assay_type=${binding}&relation==`
    ).then((data) => {
      setLigand(data)
    });
  }

  return (
    <div>
      <label>
        <input
          className="input"
          placeholder="Input Unit. Default is Ki"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </label>
      <br />
      <label>
        <input
          className="input"
          placeholder="Input Assay Type. Default is Binding (B)"
          value={binding}
          onChange={(e) => setBinding(e.target.value)}
        />
      </label>
      <br></br>
      <br></br>
      <button className="button" onClick={hehe}>Download Data</button>
      <br></br>
      {loading && <div>
        <progress className="progress-bar" value = {progress} max={100}></progress> 
        <br></br>
        <span style={{ textAlign: 'center'}}>{(Math.min(progress, 100)).toFixed(2)} %</span>
        </div>}
        <br></br>
        {ligand.length > 0 && <div>
          <Link className="button" href = '/tools/preprocess'>Pre-Process Molecules</Link>
          </div>}
    </div>

    
  );
}
