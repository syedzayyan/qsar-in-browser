import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  SegmentedControl,
  TextInput,
  NumberInput,
  Button,
  Table,
  Loader,
  Select,
  Paper,
  Stack,
  Group,
  Text,
  Alert,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import LigandContext from "../../context/LigandContext";
import TargetContext from "../../context/TargetContext";

const PUG_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const CID_CHUNK_SIZE = 200;

// Columns emitted by PubChem's assay CSV export that are never candidate
// "activity" columns — either identifiers or free-text metadata.
const ASSAY_META_COLUMNS = new Set([
  "PUBCHEM_RESULT_TAG",
  "PUBCHEM_SID",
  "PUBCHEM_CID",
  "PUBCHEM_EXT_DATASOURCE_SMILES",
  "PUBCHEM_ACTIVITY_URL",
  "PUBCHEM_ASSAYDATA_COMMENT",
]);

// ── Shared: resolve CIDs -> canonical SMILES in batches ───────────────────────
async function resolvePubChemSmiles(
  cids: (string | number)[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(cids.map((c) => String(c)).filter(Boolean)));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += CID_CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + CID_CHUNK_SIZE));
  }

  const map = new Map<string, string>();
  await Promise.all(
    chunks.map(async (chunk) => {
      // PubChem deprecated CanonicalSMILES/IsomericSMILES in favour of
      // SMILES (isomeric) / ConnectivitySMILES (no stereo) — request both
      // names defensively since the response silently omits unknown ones.
      const response = await fetch(
        `${PUG_BASE}/compound/cid/property/SMILES,ConnectivitySMILES/JSON`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `cid=${chunk.join(",")}`,
        },
      );
      if (!response.ok) return;
      const json = await response.json();
      const props = json?.PropertyTable?.Properties ?? [];
      props.forEach((p: any) => {
        const smiles = p.SMILES ?? p.ConnectivitySMILES;
        if (p.CID != null && smiles) {
          map.set(String(p.CID), smiles);
        }
      });
    }),
  );
  return map;
}

export default function PubChemGetter() {
  const [mode, setMode] = useState<"assay" | "similarity">("assay");

  return (
    <div className="data-loaders pubchem-loader container">
      <Text size="sm" c="dimmed" mb="sm">
        PubChem's chemical space isn't scoped to a biological target the way
        ChEMBL is, so pick one of these two bounded entry points instead of
        browsing it directly.
      </Text>
      <SegmentedControl
        fullWidth
        mb="md"
        value={mode}
        onChange={(v) => setMode(v as "assay" | "similarity")}
        data={[
          { label: "Search by Assay (activity data)", value: "assay" },
          { label: "Similarity Search (structures only)", value: "similarity" },
        ]}
      />
      {mode === "assay" ? <AssaySearch /> : <SimilaritySearch />}
    </div>
  );
}

// ── Assay search — activity-paired ────────────────────────────────────────────
function AssaySearch() {
  const { setLigand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [assays, setAssays] = useState<{ aid: number; name: string; description: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedAid, setSelectedAid] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [fetchingAssay, setFetchingAssay] = useState(false);
  const [assayRows, setAssayRows] = useState<Record<string, any>[]>([]);
  const [activityColumns, setActivityColumns] = useState<string[]>([]);
  const [chosenActCol, setChosenActCol] = useState<string>("");
  const [resolving, setResolving] = useState(false);
  const [processedRows, setProcessedRows] = useState<Record<string, any>[]>([]);

  async function searchAssays(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setAssays([]);
    setSelectedAid(null);
    setAssayRows([]);
    setProcessedRows([]);
    try {
      const esearch = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pcassay&retmode=json&retmax=25&term=${encodeURIComponent(query)}`,
      );
      const esearchJson = await esearch.json();
      const idlist: string[] = esearchJson?.esearchresult?.idlist ?? [];
      if (idlist.length === 0) {
        setSearching(false);
        return;
      }
      const descResponse = await fetch(
        `${PUG_BASE}/assay/aid/${idlist.join(",")}/description/JSON`,
      );
      const descJson = await descResponse.json();
      const containers = descJson?.PC_AssayContainer ?? [];
      const parsed = containers.map((c: any) => {
        const descr = c.assay?.descr;
        return {
          aid: descr?.aid?.id,
          name: descr?.name ?? "Untitled assay",
          description: (descr?.description ?? []).join(" ").slice(0, 200),
        };
      });
      setAssays(parsed);
    } catch (err: any) {
      setError(err.message ?? "Assay search failed");
    } finally {
      setSearching(false);
    }
  }

  async function selectAssay(aid: number, name: string) {
    setSelectedAid(aid);
    setSelectedName(name);
    setFetchingAssay(true);
    setError(null);
    setAssayRows([]);
    setProcessedRows([]);
    try {
      const response = await fetch(`${PUG_BASE}/assay/aid/${aid}/CSV`);
      if (!response.ok) throw new Error("Failed to fetch assay data");
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const headers = parsed.meta.fields ?? [];

      const rows = (parsed.data as any[]).filter((r) => r.PUBCHEM_CID);

      // Candidate activity columns: numeric-looking, non-metadata headers.
      const candidates = headers.filter((h) => {
        if (ASSAY_META_COLUMNS.has(h) || h === "PUBCHEM_ACTIVITY_OUTCOME") return false;
        return rows.some((r) => r[h] !== "" && r[h] != null && !isNaN(Number(r[h])));
      });

      setAssayRows(rows);
      setActivityColumns(candidates);
      setChosenActCol(
        candidates.includes("PUBCHEM_ACTIVITY_SCORE")
          ? "PUBCHEM_ACTIVITY_SCORE"
          : (candidates[0] ?? ""),
      );
    } catch (err: any) {
      setError(err.message ?? "Failed to load assay data");
    } finally {
      setFetchingAssay(false);
    }
  }

  async function resolveAndPreview() {
    if (!chosenActCol) return;
    setResolving(true);
    setError(null);
    try {
      const withActivity = assayRows.filter(
        (r) => r[chosenActCol] !== "" && r[chosenActCol] != null && !isNaN(Number(r[chosenActCol])),
      );
      const smilesMap = await resolvePubChemSmiles(withActivity.map((r) => r.PUBCHEM_CID));
      const rows = withActivity
        .map((r) => ({
          id: r.PUBCHEM_CID,
          canonical_smiles: smilesMap.get(String(r.PUBCHEM_CID)),
          [chosenActCol]: Number(r[chosenActCol]),
        }))
        .filter((r) => r.canonical_smiles);
      setProcessedRows(rows);
    } catch (err: any) {
      setError(err.message ?? "Failed to resolve structures");
    } finally {
      setResolving(false);
    }
  }

  function handleProcessMolecules() {
    setLigand(processedRows);
    setTarget({
      ...target,
      target_name: selectedName,
      activity_columns: [chosenActCol],
      data_source: "pubchem_assay",
      pre_processed: false,
    });
    localStorage.setItem("dataSource", "pubchem_assay");
    router.push("/tools/preprocess/");
  }

  return (
    <Stack gap="md">
      <form onSubmit={searchAssays}>
        <Group align="flex-end" gap="sm">
          <TextInput
            label="Search PubChem BioAssay"
            placeholder="e.g. EGFR, mevalonate pathway…"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            required
            style={{ flex: 1 }}
          />
          <Button type="submit" loading={searching}>
            Search
          </Button>
        </Group>
      </form>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {error}
        </Alert>
      )}

      {searching && <Loader size="sm" />}

      {assays.length > 0 && !selectedAid && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Assay Name</Table.Th>
              <Table.Th>AID</Table.Th>
              <Table.Th>Description</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {assays.map((a) => (
              <Table.Tr key={a.aid} onClick={() => selectAssay(a.aid, a.name)} style={{ cursor: "pointer" }}>
                <Table.Td>{a.name}</Table.Td>
                <Table.Td>{a.aid}</Table.Td>
                <Table.Td>{a.description}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {selectedAid && (
        <Paper withBorder p="md">
          <Group justify="space-between" mb="sm">
            <Text fw={500}>{selectedName} (AID {selectedAid})</Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setSelectedAid(null);
                setAssayRows([]);
                setProcessedRows([]);
              }}
            >
              ← Back to results
            </Button>
          </Group>

          {fetchingAssay ? (
            <Loader size="sm" />
          ) : (
            <Stack gap="sm">
              <Text size="sm">{assayRows.length.toLocaleString()} tested compounds found.</Text>
              <Select
                label="Activity Column"
                data={activityColumns}
                value={chosenActCol}
                onChange={(v) => v && setChosenActCol(v)}
              />
              <Button onClick={resolveAndPreview} loading={resolving} disabled={!chosenActCol}>
                Resolve Structures
              </Button>

              {processedRows.length > 0 && (
                <Button color="green" onClick={handleProcessMolecules}>
                  Process Molecules ({processedRows.length.toLocaleString()})
                </Button>
              )}
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
}

// ── Similarity search — structure-only ────────────────────────────────────────
function SimilaritySearch() {
  const { setLigand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);
  const router = useRouter();

  const [smiles, setSmiles] = useState("");
  const [threshold, setThreshold] = useState(90);
  const [maxRecords, setMaxRecords] = useState(500);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  async function pollListKey(listKey: string): Promise<number[]> {
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${PUG_BASE}/compound/listkey/${listKey}/cids/JSON`);
      const json = await response.json();
      if (json?.IdentifierList?.CID) {
        return json.IdentifierList.CID;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Similarity search timed out — try a smaller max records value");
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setRows([]);
    try {
      const kickoff = await fetch(
        `${PUG_BASE}/compound/similarity/smiles/${encodeURIComponent(smiles)}/JSON?Threshold=${threshold}&MaxRecords=${maxRecords}`,
      );
      if (!kickoff.ok) throw new Error("Invalid SMILES or search request failed");
      const kickoffJson = await kickoff.json();
      const listKey = kickoffJson?.Waiting?.ListKey;
      const cids: number[] = listKey
        ? await pollListKey(listKey)
        : (kickoffJson?.IdentifierList?.CID ?? []);

      if (cids.length === 0) {
        setSearching(false);
        return;
      }

      const smilesMap = await resolvePubChemSmiles(cids);
      const resolved = cids
        .map((cid) => ({ id: cid, canonical_smiles: smilesMap.get(String(cid)) }))
        .filter((r) => r.canonical_smiles);
      setRows(resolved);
    } catch (err: any) {
      setError(err.message ?? "Similarity search failed");
    } finally {
      setSearching(false);
    }
  }

  function handleProcessMolecules() {
    setLigand(rows);
    setTarget({
      ...target,
      target_name: "PubChem Similarity Search",
      activity_columns: [],
      data_source: "pubchem_similarity",
      pre_processed: false,
    });
    localStorage.setItem("dataSource", "pubchem_similarity");
    router.push("/tools/preprocess/");
  }

  return (
    <Stack gap="md">
      <form onSubmit={runSearch}>
        <Stack gap="sm">
          <TextInput
            label="Query SMILES"
            placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O (aspirin)"
            value={smiles}
            onChange={(e) => setSmiles(e.currentTarget.value)}
            required
          />
          <Group grow>
            <NumberInput
              label="Tanimoto Threshold (%)"
              min={40}
              max={100}
              value={threshold}
              onChange={(v) => setThreshold(typeof v === "number" ? v : 90)}
            />
            <NumberInput
              label="Max Records"
              min={1}
              max={2000}
              value={maxRecords}
              onChange={(v) => setMaxRecords(typeof v === "number" ? v : 500)}
            />
          </Group>
          <Button type="submit" loading={searching}>
            Search
          </Button>
        </Stack>
      </form>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {error}
        </Alert>
      )}

      {searching && (
        <Group gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">Searching PubChem — this can take up to a minute…</Text>
        </Group>
      )}

      {rows.length > 0 && (
        <Paper withBorder p="md">
          <Stack gap="sm">
            <Text size="sm">{rows.length.toLocaleString()} similar compounds found.</Text>
            <Button color="green" onClick={handleProcessMolecules}>
              Process Molecules ({rows.length.toLocaleString()})
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
