import { useContext, useState } from "react";
import dummyData from "../utils/data.json";
import CompoundGetter from "./CompoundGetter";
import TargetContext from "../../context/TargetContext";

export default function TargetGetter() {
  const [targetQuery, setTargetQuery] = useState('');
  const [targetDetails, setTargetDetails] = useState(dummyData.targets);
  const [loading, setLoading] = useState(false);
  const {target, setTarget} = useContext(TargetContext)

  function fetchTarget() {
    setLoading(true)
    fetch(`https://www.ebi.ac.uk/chembl/api/data/target/search?format=json&q=${targetQuery}`)
      .then((response) => response.json())
      .then((data) => {
        let target_data = data.targets.slice(0, 5);
        setTargetDetails(target_data);
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  return (
    <div className="container">
      <div style={{ width: "100%", display: "flex", gap: "10px", overflow: "hidden"}}>
        <input
          className="input"
          placeholder="Search for relevant words to your Target"
          list="browsers"
          name="myBrowser"
          onChange={(e) => setTargetQuery(e.target.value)}
        />
        <button onClick={fetchTarget} className="button">{loading ? <span>Loading</span> : <span>Search</span>}</button>
      </div>
      {target === "" ? (null): (<CompoundGetter />)}
      <table className="custom-table">
        <thead>
          <tr>
            <th>Target Name</th>
            <th>ChEMBL ID</th>
            <th>Organism</th>
          </tr>
        </thead>
        <tbody>
          {targetDetails.map((tars) => (
            <tr key={tars.target_chembl_id} onClick={() => {setTarget(tars.target_chembl_id)}}>
              <td>{tars.pref_name}</td>
              <td>{tars.target_chembl_id}</td>
              <td>{tars.organism}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}