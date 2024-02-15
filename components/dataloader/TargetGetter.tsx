import { useContext, useState } from "react";
import dummyData from "../utils/data.json";
import CompoundGetter from "./CompoundGetter";
import TargetContext from "../../context/TargetContext";
import ModalComponent from "../ui-comps/ModalComponent";
import Loader from "../ui-comps/Loader";

export default function TargetGetter() {
  const [targetQuery, setTargetQuery] = useState('');
  const [targetDetails, setTargetDetails] = useState(dummyData.targets);
  const [loading, setLoading] = useState(false);
  const { target, setTarget } = useContext(TargetContext);
  const [modalState, setModalState] = useState(target === "");

  function fetchTarget(e) {
    setLoading(true);
    setTarget("");
    fetch(`https://www.ebi.ac.uk/chembl/api/data/target/search?format=json&q=${targetQuery}`)
      .then((response) => response.json())
      .then((data) => {
        let target_data = data.targets
        setTargetDetails(target_data);
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error:", error);
      });
      e.preventDefault()
  }

  return (
    <div className="container data-loaders chembl-loader">
      <form onSubmit={e => fetchTarget(e)} style={{ width: "90%", display: "flex", gap: "10px", flexDirection: "column" }}>
        <h2>ChEMBL Data Fetcher</h2>
        <input
          className="input"
          placeholder="Search for relevant words to your Target"
          onChange={(e) => setTargetQuery(e.target.value)}
          defaultValue={target}
          required={true}

        />
        <input type="submit" onSubmit={fetchTarget} className="button" value="Search for your Target"/>
      </form>
      {target === "" ? (
        <div style={{ overflow: "scroll", height: "300px", minWidth: "300px", display: "flex", "justifyContent": "center" }}>
          {loading ? <Loader /> :
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
                  <tr key={tars.target_chembl_id} onClick={() => { setTarget(tars.target_chembl_id) }}>
                    <td>{tars.pref_name}</td>
                    <td>{tars.target_chembl_id}</td>
                    <td>{tars.organism}</td>
                  </tr>
                ))}
              </tbody>

            </table>
          }
        </div>
      ) : (<ModalComponent isOpen={modalState}
        closeModal={() => setModalState(false)}
        height="40"
        width="30"
      >
        <CompoundGetter /></ModalComponent>
      )}
    </div>
  )
}