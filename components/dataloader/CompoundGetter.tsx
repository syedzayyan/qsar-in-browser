import { useContext, useState } from "react";
import TargetContext from "../../context/TargetContext";
import LigandContext from "../../context/LigandContext";
import Link from "next/link";
import FAQComp from "../ui-comps/FAQComp";

// whitelist from your counts, filtered by count > 500
const VALID_COMBOS: Record<string, string[]> = {
  B: ["IC50", "Ki", "Potency", "EC50"],          // Binding
  F: ["Potency", "IC50", "EC50", "ED50", "AC50", "XC50"], // Functional
  ADMET: ["IC50"],
  T: ["IC50"],
  // P, U have no units with count > 500 -> all units disabled
};

const ALL_UNITS = ["Ki", "IC50", "XC50", "EC50", "AC50", "Kd", "Potency", "ED50"];

export default function CompoundGetter() {
  const [unit, setUnit] = useState("Ki");
  const [binding, setBinding] = useState<keyof typeof VALID_COMBOS | string>("B");
  const { target, setTarget } = useContext(TargetContext);
  const { ligand, setLigand } = useContext(LigandContext);
  const [ligandSearch, setLigandSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function getFullActivityData(url: string) {
    setLigandSearch(false);
    setLoading(true);

    const chembl_url = "https://www.ebi.ac.uk";
    const results: any[] = [{}];

    let nextUrl = chembl_url + url;

    while (nextUrl !== chembl_url + "null") {
      const response = await fetch(nextUrl);
      const data = await response.json();
      results.push(...data.activities);

      nextUrl = chembl_url + data.page_meta.next;

      const newProgress = (results.length / data.page_meta.total_count) * 100;
      setProgress(newProgress);
    }
    setLigandSearch(true);
    return results.slice(1);
  }

  function hehe() {
    getFullActivityData(
      `/chembl/api/data/activity?format=json&target_chembl_id=${target.target_id}&type=${unit}&target_organism=Homo%20sapiens&assay_type=${binding}&relation==`,
    ).then((data) => {
      data.map((x: any) => {
        x[unit] = x["standard_value"];
        x["id"] = x["molecule_chembl_id"];
        delete x["standard_value"];
        return x;
      });
      setLigand(data);
    });
    setTarget({ ...target, activity_columns: [unit], data_source: "chembl" });
  }

  const allowedUnits = VALID_COMBOS[binding] ?? [];

  return (
    <div
      style={{
        width: "inherit",
        gap: "10px",
        display: "flex",
        flexDirection: "column",
        alignContent: "center",
        justifyContent: "center",
      }}
    >
      <h2>Small Molecule Getter</h2>
      <FAQComp>
        For your specific target select, small molecules will be searched that
        have been tested in assays against your target is filtered. You could
        select the type of assay they have been tested in and the units
        provided. Generally speaking it is best to avoid&nbsp;
        <a href="https://pubs.acs.org/doi/full/10.1021/acs.jcim.4c00049">
          mixing various forms of data types
        </a>
        . Since, Binding Assays are more prevalent with Ki being the preferred
        unit, they are the default.
      </FAQComp>

      <label htmlFor="input-assay-type">Assay Type</label>
      <select
        id="input-assay-type"
        className="input"
        value={binding}
        onChange={(e) => {
          const newBinding = e.target.value;
          setBinding(newBinding);

          const newAllowed = VALID_COMBOS[newBinding] ?? [];
          if (!newAllowed.includes(unit) && newAllowed.length > 0) {
            setUnit(newAllowed[0]);
          }
        }}
      >
        <option value="B">B (Binding)</option>
        <option value="F">F (Functional)</option>
        <option value="ADMET">ADMET (ADME Data)</option>
        <option value="T">T (Toxicity)</option>
        <option value="P">P (Physiochemical)</option>
        <option value="U">U (Unclassified)</option>
      </select>

      <label htmlFor="input-unit">Unit Type</label>
      <select
        id="input-unit"
        className="input"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
      >
        {ALL_UNITS.map((u) => (
          <option
            key={u}
            value={u}
            disabled={!allowedUnits.includes(u)}
          >
            {u}
          </option>
        ))}
      </select>

      <button className="button" onClick={hehe}>
        Fetch Data
      </button>

      {loading && (
        <div>
          <progress
            className="progress-bar"
            value={progress}
            max={100}
            style={{ width: "100%", marginBottom: "10px" }}
          ></progress>
          <br />
          <span style={{ textAlign: "center" }}>
            {Math.min(progress, 100).toFixed(2)} %
          </span>
        </div>
      )}
      <br />
      {ligand.length > 0 ? (
        <div style={{ marginTop: "10px" }}>
          <Link className="button" href="/tools/preprocess/">
            Pre-Process Molecules
          </Link>
        </div>
      ) : (
        <span>
          {ligandSearch &&
            "There are zero compounds for this target using this filtration criteria"}
        </span>
      )}
    </div>
  );
}
