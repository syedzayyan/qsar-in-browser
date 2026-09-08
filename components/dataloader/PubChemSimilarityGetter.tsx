import { useContext, useState } from "react";
import Link from "next/link";
import TargetContext from "../../context/TargetContext";
import LigandContext from "../../context/LigandContext";
import NotificationContext from "../../context/NotificationContext";
import { fetchPubChemJsonWithRetry, resolveSmilesForCids, PUBCHEM_DOWN_MESSAGE } from "../utils/pubchem";
import { Button, Progress, Slider, NumberInput, Paper, TextInput } from "@mantine/core";

export default function PubChemSimilarityGetter() {
  const { target, setTarget } = useContext(TargetContext);
  const { ligand, setLigand } = useContext(LigandContext);
  const { pushNotification } = useContext(NotificationContext);

  const [smiles, setSmiles] = useState("");
  const [threshold, setThreshold] = useState(90);
  const [maxRecords, setMaxRecords] = useState<number>(500);

  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function fetchData(e) {
    e.preventDefault();
    const query = smiles.trim();
    if (!query) return;

    setSearched(false);
    setLoading(true);
    setProgress(0);

    try {
      const cidData = await fetchPubChemJsonWithRetry(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/smiles/${encodeURIComponent(query)}/cids/JSON?Threshold=${threshold}&MaxRecords=${maxRecords}`,
      );
      const cids: number[] = cidData?.IdentifierList?.CID || [];

      if (cids.length === 0) {
        setLigand([]);
        setSearched(true);
        pushNotification({
          type: "info",
          message: "No compounds in PubChem matched that structure at this similarity threshold.",
        });
        return;
      }

      const smilesMap = await resolveSmilesForCids(cids, (resolved, total) => {
        setProgress((resolved / total) * 100);
      });

      const data = cids
        .map((cid) => {
          const resolvedSmiles = smilesMap.get(String(cid));
          if (!resolvedSmiles) return null;
          return { id: cid, canonical_smiles: resolvedSmiles };
        })
        .filter(Boolean);

      setLigand(data as any[]);
      setTarget({
        ...target,
        target_id: query,
        target_name: `PubChem similarity search: ${query}`,
        target_organism: "",
        pre_processed: false,
        activity_columns: [],
        data_source: "pubchem-similarity",
      });
      setSearched(true);
    } catch (error: any) {
      console.error("PubChem similarity search failed:", error);
      if (/status indicates failure|not a valid/i.test(error.message || "")) {
        pushNotification({
          type: "warning",
          message: "PubChem couldn't parse that SMILES string - double check it and try again.",
        });
      } else {
        pushNotification({ type: "warning", message: PUBCHEM_DOWN_MESSAGE });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="data-loaders pubchem-loader container">
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
        <h2 style={{ textAlign: "center", marginBottom: 30 }}>
          Find structurally similar compounds on PubChem
        </h2>

        <Paper shadow="sm" p="md">
          <p>
            Enter a SMILES string and QITB will pull structurally similar compounds from PubChem.
            This mode doesn't carry any activity data - it's for exploring or expanding a chemical
            series, not for training a model directly.
          </p>

          <form onSubmit={fetchData} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <TextInput
              label="Query SMILES"
              placeholder="e.g. CC(=O)OC1=CC=CC=C1C(=O)O"
              value={smiles}
              onChange={(e) => setSmiles(e.target.value)}
              required
            />

            <div>
              <label style={{ display: "block", marginBottom: 4 }}>
                Similarity Threshold: {threshold}%
              </label>
              <Slider value={threshold} onChange={setThreshold} min={70} max={100} step={1} />
            </div>

            <NumberInput
              label="Maximum Results"
              value={maxRecords}
              onChange={(v) => setMaxRecords(typeof v === "number" ? v : 500)}
              min={10}
              max={5000}
              step={100}
            />

            <Button type="submit" fullWidth loading={loading} disabled={!smiles.trim()}>
              Search Similar Compounds
            </Button>
          </form>

          {loading && (
            <>
              <Progress value={progress} mt="md" />
              <div style={{ textAlign: "center", marginTop: 8 }}>
                {Math.min(progress, 100).toFixed(1)}%
              </div>
            </>
          )}

          {searched && ligand.length > 0 && (
            <>
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <h3>{ligand.length.toLocaleString()} compounds found</h3>
              </div>
              <Link href="/tools/preprocess/" passHref>
                <Button fullWidth mt="md">
                  Process Molecules
                </Button>
              </Link>
            </>
          )}

          {searched && ligand.length === 0 && (
            <p style={{ textAlign: "center", marginTop: 20 }}>
              No compounds found.
            </p>
          )}
        </Paper>
      </div>
    </div>
  );
}
