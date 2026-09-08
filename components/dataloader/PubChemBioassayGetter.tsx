import { useContext, useState, useEffect, useMemo } from "react";
import TargetContext from "../../context/TargetContext";
import LigandContext from "../../context/LigandContext";
import NotificationContext from "../../context/NotificationContext";
import Link from "next/link";
import { fetchPubChemJsonWithRetry, resolveSmilesForCids, PUBCHEM_DOWN_MESSAGE } from "../utils/pubchem";
import { Button, Progress, Select, Loader, Paper } from "@mantine/core";

// Column order of the PubChem "concise" bioactivity table for a protein target.
const COLS = {
  AID: 0,
  SID: 1,
  CID: 2,
  ACTIVITY_OUTCOME: 3,
  TARGET_GENE_ID: 4,
  ACTIVITY_NAME: 5,
  ACTIVITY_QUALIFIER: 6,
  ACTIVITY_VALUE_UM: 7,
  ASSAY_NAME: 8,
  ASSAY_TYPE: 9,
  PUBMED_ID: 10,
};

type ConciseRow = string[];

export default function PubChemBioassayGetter() {
  const { target, setTarget } = useContext(TargetContext);
  const { ligand, setLigand } = useContext(LigandContext);
  const { pushNotification } = useContext(NotificationContext);

  const [rows, setRows] = useState<ConciseRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [unit, setUnit] = useState<string | null>(null);

  const [ligandSearch, setLigandSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // -----------------------------
  // Fetch the whole bioactivity table for the confirmed UniProt accession once
  // -----------------------------
  useEffect(() => {
    if (!target?.target_id) return;

    setRows([]);
    setUnit(null);
    setRowsLoading(true);

    fetchPubChemJsonWithRetry(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/protein/accession/${target.target_id}/concise/JSON`,
    )
      .then((data) => {
        const table: ConciseRow[] = (data?.Table?.Row || []).map((r: any) => r.Cell);
        setRows(table);
        setRowsLoading(false);
      })
      .catch((error) => {
        console.error("PubChem bioactivity fetch failed:", error);
        setRowsLoading(false);
        if (/no protein found/i.test(error.message || "")) {
          pushNotification({
            type: "info",
            message: "PubChem doesn't have any bioactivity data for this target.",
          });
        } else {
          pushNotification({ type: "warning", message: PUBCHEM_DOWN_MESSAGE });
        }
      });
  }, [target?.target_id]);

  // -----------------------------
  // Which Activity Name values (IC50, Ki, Kd, ...) actually have usable values
  // -----------------------------
  const unitOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const name = row[COLS.ACTIVITY_NAME];
      const value = row[COLS.ACTIVITY_VALUE_UM];
      if (!name || !value) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ value: name, label: `${name} (${count.toLocaleString()})` }));
  }, [rows]);

  useEffect(() => {
    if (!unit && unitOptions.length > 0) {
      setUnit(unitOptions[0].value);
    }
  }, [unitOptions, unit]);

  const matchingRows = useMemo(
    () => rows.filter((row) => row[COLS.ACTIVITY_NAME] === unit && row[COLS.ACTIVITY_VALUE_UM]),
    [rows, unit],
  );

  // -----------------------------
  // Resolve CIDs to SMILES and hand the merged data off to the app
  // -----------------------------
  async function fetchData() {
    if (!unit || matchingRows.length === 0) return;

    setLigandSearch(false);
    setLoading(true);
    setProgress(0);

    try {
      const cids = matchingRows.map((row) => row[COLS.CID]);
      const smilesMap = await resolveSmilesForCids(cids, (resolved, total) => {
        setProgress((resolved / total) * 100);
      });

      const data = matchingRows
        .map((row) => {
          const smiles = smilesMap.get(row[COLS.CID]);
          if (!smiles) return null;
          return {
            id: row[COLS.CID],
            canonical_smiles: smiles,
            // PubChem reports this column in µM; QITB's cleaning/log10 step
            // (and ChEMBL's own standard_value convention) expects nM.
            [unit]: parseFloat(row[COLS.ACTIVITY_VALUE_UM]) * 1000,
            aid: row[COLS.AID],
            assay_name: row[COLS.ASSAY_NAME],
          };
        })
        .filter(Boolean);

      setLigand(data as any[]);
      setTarget({
        ...target,
        activity_columns: [unit],
        data_source: "pubchem-target",
      });

      setLigandSearch(true);
    } catch (error) {
      console.error("Resolving PubChem SMILES failed:", error);
      pushNotification({ type: "warning", message: PUBCHEM_DOWN_MESSAGE });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h2 style={{ textAlign: "center", marginBottom: 30 }}>
        Select Activity Measurements
      </h2>

      <Paper shadow="sm" p="md">
        <p>
          Select the activity type to extract all small molecules with PubChem bioassay data
          reported against <strong>{target.target_name || target.target_id}</strong>. PubChem
          reports these values in µM - QITB converts them to nM to match the rest of the app.
        </p>

        {rowsLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Loader size={60} />
          </div>
        ) : (
          <>
            <Select
              label="Activity Type"
              placeholder={unitOptions.length ? "Select an activity type" : "No activity data found"}
              value={unit}
              onChange={setUnit}
              data={unitOptions}
              disabled={unitOptions.length === 0}
              mb="lg"
            />

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h3>{matchingRows.length.toLocaleString()} matching activities</h3>
            </div>

            <Button fullWidth onClick={fetchData} disabled={!unit || matchingRows.length === 0 || loading}>
              Fetch Full Dataset
            </Button>
          </>
        )}

        {loading && (
          <>
            <Progress value={progress} mt="md" />
            <div style={{ textAlign: "center", marginTop: 8 }}>
              {Math.min(progress, 100).toFixed(1)}%
            </div>
          </>
        )}

        {ligand.length > 0 && (
          <Link href="/tools/preprocess/" passHref>
            <Button fullWidth mt="md">
              Process Molecules
            </Button>
          </Link>
        )}

        {ligandSearch && ligand.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 20 }}>
            No compounds found.
          </p>
        )}
      </Paper>
    </div>
  );
}
