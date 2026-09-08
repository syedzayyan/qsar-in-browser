"use client";

import { useContext, useState, useCallback, useRef } from "react";
import {
  Button,
  Card,
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Progress,
  Table,
  SimpleGrid,
  Divider,
  Paper,
  NumberInput,
  Flex,
  Textarea,
  ActionIcon,
  Tooltip,
  Loader,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconRefresh,
  IconDownload,
  IconEdit,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useGAContext } from "../../../context/GAContext";
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import TargetContext from "../../../context/TargetContext";
import MoleculeStructure from "../../../components/tools/toolComp/MoleculeStructure";
import { readFpSettings } from "../../../components/utils/get_fp_settings";
import { rdkitRpc, rdkitRequestId } from "../../../components/utils/rdkit_rpc";

const DEFAULT_SMILES = [
  "CCO",
  "CC(=O)C",
  "Nc1ccccc1",
  "CC1=CC=CC=C1",
  "c1ccncc1",
];
const ZINC_URL =
  "https://raw.githubusercontent.com/AustinT/mol_ga/refs/heads/main/mol_ga/data/zinc250k.smiles";
const ZINC_SAMPLE_SIZE = 20;
const PYODIDE_RPC_TIMEOUT_MS = 60000;

async function mutateBatchRpc(rdkit: any, smiles: string[]): Promise<string[]> {
  const id = rdkitRequestId("mutate");
  const data = await rdkitRpc(rdkit, { function: "mutate_batch", id, smiles }, "mutate_batch");
  return data.results;
}

async function fingerprintBatchRpc(
  rdkit: any,
  smiles: string[],
  fpSettings: ReturnType<typeof readFpSettings>,
): Promise<number[][]> {
  const id = rdkitRequestId("fp");
  const data = await rdkitRpc(
    rdkit,
    {
      function: "only_fingerprint",
      id,
      mol_data: smiles.map((smi) => ({ canonical_smiles: smi })),
      formStuff: fpSettings,
    },
    "only_fingerprint",
  );
  return data.results.map((x: any) => x.fingerprint);
}

function mlScreenRpc(pyodide: any, fingerprints: number[][], opts: 1 | 2): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const id = rdkitRequestId("score");
    const timer = setTimeout(() => {
      pyodide.removeEventListener("message", handler);
      reject(new Error("Timed out waiting for a scored prediction - make sure a classical model has been trained."));
    }, PYODIDE_RPC_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.data.id !== id) return;
      clearTimeout(timer);
      pyodide.removeEventListener("message", handler);
      if (event.data.success !== "ok") {
        reject(new Error(event.data.error || "Scoring failed"));
        return;
      }
      resolve(event.data.results);
    };

    pyodide.addEventListener("message", handler);
    pyodide.postMessage({ id, func: "ml-screen", fp: fingerprints, opts });
  });
}

// Classification returns predict_proba pairs [P(class0), P(class1)] per
// molecule - we maximize P(class 1), the sklearn convention for the
// positive/"active" class. Regression returns a scalar directly.
function extractScore(raw: any, modelKind: string): number {
  if (modelKind === "classification") {
    return Array.isArray(raw) ? Number(raw[1] ?? raw[0]) : Number(raw);
  }
  return Array.isArray(raw) ? Number(raw[0]) : Number(raw);
}

async function scoreBatch(
  rdkit: any,
  pyodide: any,
  smilesArray: string[],
  fpSettings: ReturnType<typeof readFpSettings>,
  modelKind: string,
): Promise<{ smiles: string[]; scores: number[] }> {
  const fps = await fingerprintBatchRpc(rdkit, smilesArray, fpSettings);
  // generateFingerprints silently drops molecules it fails on, so keep the
  // arrays aligned to whatever came back rather than assuming a 1:1 length match.
  const smiles = smilesArray.slice(0, fps.length);
  const opts = modelKind === "regression" ? 1 : 2;
  const raw = await mlScreenRpc(pyodide, fps, opts);
  const scores = raw.map((r) => extractScore(r, modelKind));
  return { smiles, scores };
}

export default function GenerativeMol() {
  const { gaState, setGAState } = useGAContext();
  const { rdkit } = useContext(RDKitContext);
  const { pyodide } = useContext(PyodideContext);
  const { target } = useContext(TargetContext);

  const [settings, setSettings] = useState({ maxGenerations: 5 });
  const [seedSmiles, setSeedSmiles] = useState<string[]>(DEFAULT_SMILES);
  const [editingSeeds, setEditingSeeds] = useState(false);
  const [seedDraft, setSeedDraft] = useState("");
  const [loadingZinc, setLoadingZinc] = useState(false);
  const [zincError, setZincError] = useState<string | null>(null);
  const [gaError, setGaError] = useState<string | null>(null);

  const cancelledRef = useRef(false);

  const isRunning = gaState.isRunning;
  const hasResults = !isRunning && gaState.population.length > 0;
  const canRun = !!target.machine_learning && (target.activity_columns?.length ?? 0) > 0;

  // ── Seed editing ───────────────────────────────────────────────────────────
  const startEditing = () => {
    setSeedDraft(seedSmiles.join(", "));
    setEditingSeeds(true);
  };
  const cancelEdit = () => setEditingSeeds(false);
  const confirmEdit = () => {
    const parsed = seedDraft
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length > 0) setSeedSmiles(parsed);
    setEditingSeeds(false);
  };

  // ── ZINC sampler ───────────────────────────────────────────────────────────
  const sampleFromZinc = useCallback(async () => {
    setLoadingZinc(true);
    setZincError(null);
    try {
      const res = await fetch(ZINC_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all = (await res.text())
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const sampled: string[] = [];
      for (let i = 0; i < all.length; i++) {
        if (sampled.length < ZINC_SAMPLE_SIZE) sampled.push(all[i]);
        else {
          const j = Math.floor(Math.random() * (i + 1));
          if (j < ZINC_SAMPLE_SIZE) sampled[j] = all[i];
        }
      }
      setSeedSmiles(sampled);
    } catch (e: any) {
      setZincError(e.message || "Failed to sample from ZINC");
    } finally {
      setLoadingZinc(false);
    }
  }, []);

  // ── GA loop (runs on the main thread, driving the rdkit + pyodide workers) ──
  const startGA = useCallback(async () => {
    if (isRunning || !rdkit || !pyodide || seedSmiles.length === 0 || !canRun) return;

    cancelledRef.current = false;
    setGaError(null);
    setGAState({
      isRunning: true,
      gen: 0,
      bestScore: 0,
      bestSmiles: "",
      population: [],
      scores: [],
    });

    try {
      const fpSettings = readFpSettings();
      const modelKind = target.machine_learning_inference_type || "regression";
      const populationSize = seedSmiles.length;
      const offspringSize = seedSmiles.length;

      let { smiles: population, scores } = await scoreBatch(
        rdkit,
        pyodide,
        seedSmiles.slice(0, populationSize),
        fpSettings,
        modelKind,
      );

      for (let gen = 0; gen < settings.maxGenerations; gen++) {
        if (cancelledRef.current) break;

        const ranked = population
          .map((smi, i) => ({ smi, score: scores[i] }))
          .sort((a, b) => b.score - a.score);

        const topK = Math.max(1, Math.min(Math.floor(populationSize * 0.2), ranked.length));
        const parents = Array.from(
          { length: offspringSize },
          () => ranked[Math.floor(Math.random() * topK)].smi,
        );

        const offspring = await mutateBatchRpc(rdkit, parents);
        const offspringScored = await scoreBatch(rdkit, pyodide, offspring, fpSettings, modelKind);

        const pool = [...population, ...offspringScored.smiles];
        const poolScores = [...scores, ...offspringScored.scores];
        const poolRanked = pool
          .map((smi, i) => ({ smi, score: poolScores[i] }))
          .sort((a, b) => b.score - a.score)
          .slice(0, populationSize);

        population = poolRanked.map((x) => x.smi);
        scores = poolRanked.map((x) => x.score);

        setGAState((prev) => ({
          ...prev,
          gen: gen + 1,
          bestScore: scores[0] ?? prev.bestScore,
          bestSmiles: population[0] ?? prev.bestSmiles,
          population,
          scores,
        }));
      }
    } catch (e: any) {
      console.error("Generative-mol GA run failed:", e);
      setGaError(e.message || "GA run failed");
    } finally {
      setGAState((prev) => ({ ...prev, isRunning: false }));
    }
  }, [isRunning, rdkit, pyodide, seedSmiles, settings, canRun, target, setGAState]);

  const resetGA = useCallback(() => {
    cancelledRef.current = true;
    setGAState({
      isRunning: false,
      gen: 0,
      bestScore: 0,
      bestSmiles: "",
      population: [],
      scores: [],
    });
  }, [setGAState]);

  // ── Derived display values ─────────────────────────────────────────────────
  const statusColor = isRunning ? "yellow" : hasResults ? "green" : "gray";
  const gaStatus = isRunning
    ? `Generation ${gaState.gen}/${settings.maxGenerations}`
    : hasResults
      ? "Complete!"
      : "Idle";
  const topResults = hasResults
    ? gaState.population.slice(0, 10).map((smi, idx) => ({
        rank: idx + 1,
        smiles: smi,
        score: gaState.scores[idx]?.toFixed(4) ?? "N/A",
      }))
    : [];
  const bestScore =
    hasResults && gaState.scores.length > 0
      ? Math.max(...gaState.scores).toFixed(4)
      : null;

  return (
    <Stack gap="xl" p="md" h="100%">
      {/* ── Header ── */}
      <div>
        <Group justify="apart">
          <Group gap="xs" align="center">
            <Title order={1}>Generative Chemistry</Title>
            <Badge color="yellow" variant="filled">
              Beta
            </Badge>
          </Group>
          <Badge color={statusColor}>{gaStatus}</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Genetic Algorithm for molecule optimisation using RDKit.js, scored by the classical ML
          model you've already trained on this dataset. This is a new, experimental feature -
          results and APIs may change.
        </Text>
      </div>

      {/* ── Controls ── */}
      <Card withBorder p="lg" radius="md">
        <Stack>
          <Group justify="apart" mb="md">
            <Title order={4}>GA Controls</Title>
            <Group>
              <Button
                leftSection={<IconPlayerPlay size={18} />}
                onClick={startGA}
                disabled={isRunning || !rdkit || !pyodide || seedSmiles.length === 0 || !canRun}
                loading={isRunning}
                title={!canRun ? "Train a classical ML model first" : undefined}
              >
                {isRunning ? "Running..." : "Start GA"}
              </Button>
              <Button
                leftSection={<IconRefresh size={18} />}
                onClick={resetGA}
                disabled={!isRunning && !hasResults}
                variant="outline"
                color="gray"
              >
                Reset
              </Button>
            </Group>
          </Group>

          <Paper withBorder p="sm" radius="sm">
            <Group grow align="flex-end">
              <NumberInput
                label="Generations"
                value={settings.maxGenerations}
                onChange={(val) =>
                  setSettings((s) => ({ ...s, maxGenerations: Number(val) || 5 }))
                }
                min={1}
                max={1000}
                disabled={isRunning}
              />

              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  Scoring model
                </Text>
                <Badge color={canRun ? "blue" : "gray"} variant="light">
                  Classical ML {canRun ? `(${target.machine_learning_inference_type})` : "- no model"}
                </Badge>
                {!canRun && (
                  <Text size="xs" c="orange">
                    ⚠ Train a classical ML model on this dataset first
                  </Text>
                )}
              </Stack>
            </Group>
          </Paper>

          {gaError && (
            <Text size="sm" c="red">
              {gaError}
            </Text>
          )}
        </Stack>
      </Card>

      {/* ── Live progress ── */}
      {isRunning && (
        <Card withBorder p="lg" radius="md">
          <Stack gap="xs">
            <Group justify="apart">
              <Text fw={500}>Progress</Text>
              <Badge color="blue">Live</Badge>
            </Group>
            <Progress value={((gaState.gen + 1) / settings.maxGenerations) * 100} striped animated />
            <Group justify="apart">
              <Text size="sm" c="dimmed">
                Best Score: <strong>{gaState.bestScore?.toFixed(4) ?? 0}</strong>
              </Text>
              <Text size="sm" c="dimmed">
                Generation: <strong>{gaState.gen}</strong>
              </Text>
            </Group>
            {gaState.bestSmiles && (
              <Paper p="xs" withBorder>
                <Text size="xs" c="dimmed">
                  Best SMILES: <code>{gaState.bestSmiles}</code>
                </Text>
              </Paper>
            )}
          </Stack>
        </Card>
      )}

      {/* ── Final results ── */}
      {hasResults && (
        <Card withBorder p="lg" radius="md">
          <Title order={4} mb="md">
            Final Results (Top 10)
          </Title>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Rank</Table.Th>
                  <Table.Th>Structure</Table.Th>
                  <Table.Th>SMILES</Table.Th>
                  <Table.Th>Score</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {topResults.map(({ rank, smiles, score }) => (
                  <Table.Tr key={rank}>
                    <Table.Td>{rank}</Table.Td>
                    <Table.Td>
                      <MoleculeStructure id={`ga-result-${rank}`} structure={smiles} />
                    </Table.Td>
                    <Table.Td>
                      <code style={{ fontSize: 11 }}>{smiles}</code>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={rank === 1 ? "green" : "dimmed"} fw={500}>
                        {score}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
          <Divider my="md" />
          <Group justify="apart">
            <Text size="sm" c="dimmed">
              Total: <strong>{gaState.population.length}</strong> molecules
            </Text>
            {bestScore !== null && (
              <Text size="sm" c="green" fw={500}>
                Best: <strong>{bestScore}</strong>
              </Text>
            )}
          </Group>
        </Card>
      )}

      {/* ── Seed dataset ── */}
      <Card withBorder p="md" radius="md">
        <Group justify="apart" mb="xs">
          <div>
            <Title order={5}>Seed Dataset</Title>
            <Text size="xs" c="dimmed">
              {seedSmiles.length} molecules
            </Text>
          </div>
          <Group gap="xs">
            <Tooltip label={`Sample ${ZINC_SAMPLE_SIZE} from ZINC250k`}>
              <Button
                size="xs"
                variant="light"
                leftSection={loadingZinc ? <Loader size={12} /> : <IconDownload size={14} />}
                onClick={sampleFromZinc}
                disabled={loadingZinc || isRunning}
              >
                Sample ZINC250k
              </Button>
            </Tooltip>
            {!editingSeeds ? (
              <Tooltip label="Edit seeds manually">
                <ActionIcon variant="light" onClick={startEditing} disabled={isRunning}>
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <Group gap={4}>
                <Tooltip label="Confirm">
                  <ActionIcon color="green" variant="light" onClick={confirmEdit}>
                    <IconCheck size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Cancel">
                  <ActionIcon color="red" variant="light" onClick={cancelEdit}>
                    <IconX size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Group>
        </Group>

        {zincError && (
          <Text size="xs" c="red" mb="xs">
            {zincError}
          </Text>
        )}

        {editingSeeds ? (
          <Textarea
            value={seedDraft}
            onChange={(e) => setSeedDraft(e.currentTarget.value)}
            placeholder="Paste comma or newline separated SMILES..."
            autosize
            minRows={3}
            maxRows={8}
            styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
          />
        ) : (
          <SimpleGrid cols={5} spacing="xs">
            {seedSmiles.slice(0, 20).map((smi, idx) => (
              <Paper key={idx} p="xs" withBorder>
                <Flex align="center" justify="center">
                  <code style={{ fontSize: 10, wordBreak: "break-all", textAlign: "center" }}>
                    {smi}
                  </code>
                </Flex>
              </Paper>
            ))}
            {seedSmiles.length > 20 && (
              <Paper p="xs" withBorder>
                <Flex align="center" justify="center" h="100%">
                  <Text size="xs" c="dimmed">
                    +{seedSmiles.length - 20} more
                  </Text>
                </Flex>
              </Paper>
            )}
          </SimpleGrid>
        )}
      </Card>
    </Stack>
  );
}
