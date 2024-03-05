import { useContext, useState } from "react";
import TargetContext from "../../context/TargetContext";
import LigandContext from "../../context/LigandContext";
import Link from "next/link";

export default function CompoundGetter() {
  const [unit, setUnit] = useState("Ki");
  const [binding, setBinding] = useState("B");
  const { target } = useContext(TargetContext);
  const { ligand, setLigand } = useContext(LigandContext);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function getFullActivityData(url: string) {
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
      `/chembl/api/data/activity?format=json&target_chembl_id=${target.target_id}&type=${unit}&target_organism=Homo%20sapiens&assay_type=${binding}&relation==`
    ).then((data) => {
      data.map(x => {
        x["activity_column"] = x["standard_value"];
        x["id"] = x["molecule_chembl_id"];
        delete x["standard_value"];
        return x
      })
      setLigand(data);
    });

    localStorage.setItem("dataSource", "chembl")
  }

  return (
    <div style={{ width: "inherit", gap: "10px", display: "flex", flexDirection: "column", alignContent: "center", justifyContent: "center" }}>
      <label htmlFor="input-unit">Unit Type</label>
      <select className="input" onChange={(e) => { setUnit(e.target.value) }}>
        <option value="Ki">Ki</option>
        <option value="IC50">IC50</option>
        <option value="XC50">XC50</option>
        <option value="EC50">EC50</option>
        <option value="AC50">AC50</option>
        <option value="Kd">Kd</option>
        <option value="Potency">Potency</option>
        <option value="ED50">ED50</option>
      </select>

      <label htmlFor="input-assay-type">Assay Type</label>
      <select className="input" onChange={(e) => { setBinding(e.target.value) }}>
        <option value="B">B (Binding)</option>
        <option value="F">F (Functional)</option>
        <option value="ADMET">ADMET (ADME Data)</option>
        <option value="T">T  (Toxicity)</option>
        <option value="P">P (Physiochemical)</option>
        <option value="U">U (Unclassified)</option>
      </select>
      <button className="button" onClick={hehe}>Fetch Data</button>
      {loading && <div>
        <progress className="progress-bar" value={progress} max={100} style={{ width: "100%" }}></progress>
        <span style={{ textAlign: 'center' }}>{(Math.min(progress, 100)).toFixed(2)} %</span>
      </div>}
      <br></br>
      {ligand.length > 0 && <div>
        <Link className="button" href='/tools/preprocess/'>Pre-Process Molecules</Link>
      </div>}
    </div>
  );
}
