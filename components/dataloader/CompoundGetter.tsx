import { useContext, useState, useEffect } from "react";
import TargetContext from "../../context/TargetContext";
import LigandContext from "../../context/LigandContext";
import Link from "next/link";
import { Button, Progress, Select, Grid, Paper } from "@mantine/core";

export default function CompoundGetter() {
  const [unit, setUnit] = useState("Ki");
  const [binding, setBinding] = useState("B");
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const { target, setTarget } = useContext(TargetContext);
  const { setLigand } = useContext(LigandContext);

  // Local state — never touches global context until user clicks "Process Molecules"
  const [localLigands, setLocalLigands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fetchComplete, setFetchComplete] = useState(false);

  // Reset local results whenever the user changes filters
  useEffect(() => {
    setLocalLigands([]);
    setFetchComplete(false);
    setProgress(0);
  }, [unit, binding, target?.target_id]);

  // -----------------------------
  // Fetch count for selected combo
  // -----------------------------
  useEffect(() => {
    if (!target?.target_id) return;

    async function fetchCount() {
      try {
        setTotalCount(null);
        const response = await fetch(
          `https://www.ebi.ac.uk/chembl/api/data/activity?format=json&target_chembl_id=${target.target_id}&type=${unit}&target_organism=Homo%20sapiens&assay_type=${binding}&relation==`,
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const json = await response.json();
        setTotalCount(json?.page_meta?.total_count ?? null);
      } catch (err) {
        console.error("Count fetch failed:", err);
        setTotalCount(null);
      }
    }

    fetchCount();
  }, [target?.target_id, unit, binding]);

  // -----------------------------
  // Fetch full activity data into LOCAL state only
  // -----------------------------
  async function getFullActivityData(url: string) {
    setLoading(true);
    setProgress(0);

    const chembl_url = "https://www.ebi.ac.uk";
    const limit = 1000;

    const firstResponse = await fetch(`${chembl_url}${url}&limit=${limit}&offset=0`);
    const firstData = await firstResponse.json();
    const total: number = firstData.page_meta.total_count;

    const results: any[] = [...firstData.activities];
    setProgress((results.length / total) * 100);

    const offsets: number[] = [];
    for (let offset = limit; offset < total; offset += limit) {
      offsets.push(offset);
    }

    await Promise.all(
      offsets.map((offset) =>
        fetch(`${chembl_url}${url}&limit=${limit}&offset=${offset}`)
          .then((r) => r.json())
          .then((data) => {
            results.push(...data.activities);
            setProgress((results.length / total) * 100);
          })
      )
    );

    setLigandSearch(true);
    setLoading(false);
    setFetchComplete(true);
  }

  function fetchData() {
    fetchFullActivityData(
      `/chembl/api/data/activity?format=json&target_chembl_id=${target.target_id}&type=${unit}&target_organism=Homo%20sapiens&assay_type=${binding}&relation==`,
    );
  }

  // Alias so the inner async fn name matches the call above
  const fetchFullActivityData = getFullActivityData;

  // -----------------------------
  // Transfer local → global and navigate
  // -----------------------------
  function handleProcessMolecules() {
    setLigand(localLigands);
    setTarget({
      ...target,
      activity_columns: [unit],
      data_source: "chembl",
    });
    // Navigation is handled by the Link wrapper
  }

  // -----------------------------
  // Layout
  // -----------------------------
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h2 style={{ textAlign: "center", marginBottom: 30 }}>
        Select Activity Measurements
      </h2>

      <Paper shadow="sm" p="md">
        <p>
          Select Assay Type and Unit Type to extract all small molecules listed
          on ChEMBL for{" "}
          <strong>{target?.pref_name ?? "your selected protein target"}</strong>
          . Please note, some Assay Type–Unit Type combinations do not have any
          small molecule data.
        </p>

        <Select
          label="Assay Type"
          value={binding}
          onChange={(v) => v && setBinding(v)}
          data={[
            { value: "B", label: "Binding" },
            { value: "F", label: "Functional" },
            { value: "ADMET", label: "ADMET" },
            { value: "T", label: "Toxicity" },
            { value: "P", label: "Physiochemical" },
            { value: "U", label: "Unclassified" },
          ]}
          mb="md"
        />

        <Select
          label="Unit Type"
          value={unit}
          onChange={(v) => v && setUnit(v)}
          data={[
            { value: "Ki", label: "Ki" },
            { value: "IC50", label: "IC50" },
            { value: "XC50", label: "XC50" },
            { value: "EC50", label: "EC50" },
            { value: "AC50", label: "AC50" },
            { value: "Kd", label: "Kd" },
            { value: "Potency", label: "Potency" },
            { value: "ED50", label: "ED50" },
          ]}
          mb="lg"
        />

        {/* COUNT DISPLAY */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {totalCount === null ? (
            <p>Loading count...</p>
          ) : (
            <h3>{totalCount.toLocaleString()} matching activities</h3>
          )}
        </div>

        <Button
          fullWidth
          onClick={fetchData}
          loading={loading}
          disabled={loading}
        >
          Fetch Full Dataset
        </Button>

        {/* Progress bar — only visible while loading */}
        {loading && (
          <>
            <Progress value={progress} mt="md" animated />
            <div style={{ textAlign: "center", marginTop: 8 }}>
              {Math.min(progress, 100).toFixed(1)}%
            </div>
          </>
        )}

        {/* Process button — only visible after a successful local fetch */}
        {fetchComplete && localLigands.length > 0 && (
          <Link href="/tools/preprocess/" passHref>
            <Button fullWidth mt="md" onClick={handleProcessMolecules}>
              Process Molecules ({localLigands.length.toLocaleString()})
            </Button>
          </Link>
        )}

        {fetchComplete && localLigands.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 20 }}>
            No compounds found.
          </p>
        )}
      </Paper>
    </div>
  );
}
