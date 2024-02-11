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
      `/chembl/api/data/activity?format=json&target_chembl_id=${target}&type=${unit}&target_organism=Homo%20sapiens&assay_type=${binding}&relation==`
    ).then((data) => {
      data.map(x => {
        x["activity_column"] = x["standard_value"];
        x["id"] = x["molecule_chembl_id"];
        delete x["standard_value"];
        return x
      })
      setLigand(data);
    });
  }

  return (
    <div style={{ width: "90%", display: "flex", gap: "10px", flexDirection : "column", marginTop : "20px" }}>
      <label htmlFor="input-unit">Unit Type</label>
      <input
          id = "input-unit"
          className="input"
          placeholder="Input Unit. Default is Ki"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      <label htmlFor="input-assay-type">Assay Type</label>
      <input
          id = "input-assay-type"
          className="input"
          placeholder="Input Assay Type. Default is Binding (B)"
          value={binding}
          onChange={(e) => setBinding(e.target.value)}
        />
      <button className="button" onClick={hehe}>Download Data</button>
      {loading && <div>
        <progress className="progress-bar" value = {progress} max={100}></progress> 
        <span style={{ textAlign: 'center'}}>{(Math.min(progress, 100)).toFixed(2)} %</span>
        </div>}
        <br></br>
        {ligand.length > 0 && <div>
          <Link className="button" href = '/tools/preprocess'>Pre-Process Molecules</Link>
          </div>}
    </div>
    
  );
}
