"use client";

import { useContext, useState, useCallback } from "react";
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
import MoleculeStructure from "../../../components/tools/toolComp/MoleculeStructure";
import { readFpSettings } from "../../../components/utils/get_fp_settings";
import TargetContext from "../../../context/TargetContext";
import { useMLResults } from "../../../context/MLResultsContext";

type ScoringModel = "classical" | "dmpnn";

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

export default function GenerativeMol() {
  const { gaState, setGAState } = useGAContext();
  const { rdkit } = useContext(RDKitContext);
  const { target } = useContext(TargetContext);
  const { classicalModelReady, dmpnnWeightsReady } = useMLResults();

  const [settings, setSettings] = useState({ maxGenerations: 5 });
  const [scoringModel, setScoringModel] = useState<ScoringModel>("classical");
  const [seedSmiles, setSeedSmiles] = useState<string[]>(DEFAULT_SMILES);
  const [editingSeeds, setEditingSeeds] = useState(false);
  const [seedDraft, setSeedDraft] = useState("");
  const [loadingZinc, setLoadingZinc] = useState(false);
  const [zincError, setZincError] = useState<string | null>(null);

  const isRunning = gaState.isRunning;
  const hasResults = !isRunning && gaState.population.length > 0;
  const canRun =
    scoringModel === "classical" ? classicalModelReady : dmpnnWeightsReady;

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

  // ── GA start / reset ───────────────────────────────────────────────────────
  const startGA = useCallback(() => {
    if (isRunning || !rdkit || seedSmiles.length === 0 || !canRun) return;
    setGAState({
      isRunning: true,
      gen: 0,
      bestScore: 0,
      bestSmiles: "",
      population: [],
      scores: [],
    });
    rdkit.postMessage({
      id: Date.now(),
      function: "run_ga",
      zincSmiles: seedSmiles,
      populationSize: seedSmiles.length,
      offspringSize: seedSmiles.length,
      maxGenerations: settings.maxGenerations,
      modelKind: target.machine_learning_inference_type,
      scoringModel,
      ...readFpSettings(),
    });
  }, [
    isRunning,
    rdkit,
    seedSmiles,
    settings,
    scoringModel,
    canRun,
    target,
    setGAState,
  ]);

  const resetGA = useCallback(() => {
    if (!rdkit) return;
    rdkit.postMessage({ function: "cancel_ga", id: Date.now() });
    setGAState({
      isRunning: false,
      gen: 0,
      bestScore: 0,
      bestSmiles: "",
      population: [],
      scores: [],
    });
  }, [rdkit, setGAState]);

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
          <Title order={1}>Generative Chemistry</Title>
          <Badge color={statusColor}>{gaStatus}</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Genetic Algorithm for molecule optimisation using RDKit.js + ML
          scoring
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
                disabled={
                  isRunning || !rdkit || seedSmiles.length === 0 || !canRun
                }
                loading={isRunning}
                title={
                  !canRun
                    ? `Train a ${scoringModel === "dmpnn" ? "D-MPNN" : "classical ML"} model first`
                    : undefined
                }
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
                  setSettings((s) => ({
                    ...s,
                    maxGenerations: Number(val) || 5,
                  }))
                }
                min={1}
                max={1000}
                disabled={isRunning}
              />

              {/* ── Scoring model selector ── */}
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  Scoring model
                </Text>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant={scoringModel === "classical" ? "filled" : "light"}
                    color="blue"
                    disabled={!classicalModelReady || isRunning}
                    onClick={() => setScoringModel("classical")}
                    title={
                      !classicalModelReady
                        ? "Train a classical ML model first"
                        : undefined
                    }
                  >
                    Classical ML
                    {!classicalModelReady && (
                      <Badge size="xs" color="gray" variant="light" ml={6}>
                        No model
                      </Badge>
                    )}
                  </Button>
                  <Button
                    size="xs"
                    variant={scoringModel === "dmpnn" ? "filled" : "light"}
                    color="grape"
                    disabled={!dmpnnWeightsReady || isRunning}
                    onClick={() => setScoringModel("dmpnn")}
                    title={
                      !dmpnnWeightsReady
                        ? "Train a D-MPNN model first"
                        : undefined
                    }
                  >
                    D-MPNN
                    {!dmpnnWeightsReady && (
                      <Badge size="xs" color="gray" variant="light" ml={6}>
                        No model
                      </Badge>
                    )}
                  </Button>
                </Group>
                {!canRun && (
                  <Text size="xs" c="orange">
                    ⚠ No {scoringModel === "dmpnn" ? "D-MPNN" : "classical ML"}{" "}
                    model trained yet
                  </Text>
                )}
              </Stack>
            </Group>
          </Paper>
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
            <Progress
              value={((gaState.gen + 1) / settings.maxGenerations) * 100}
              striped
              animated
            />
            <Group justify="apart">
              <Text size="sm" c="dimmed">
                Best Score:{" "}
                <strong>{gaState.bestScore?.toFixed(4) ?? 0}</strong>
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
                      <MoleculeStructure id={String(rank)} structure={smiles} />
                    </Table.Td>
                    <Table.Td>
                      <code style={{ fontSize: 11 }}>{smiles}</code>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="sm"
                        c={rank === 1 ? "green" : "dimmed"}
                        fw={500}
                      >
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
                leftSection={
                  loadingZinc ? (
                    <Loader size={12} />
                  ) : (
                    <IconDownload size={14} />
                  )
                }
                onClick={sampleFromZinc}
                disabled={loadingZinc || isRunning}
              >
                Sample ZINC250k
              </Button>
            </Tooltip>
            {!editingSeeds ? (
              <Tooltip label="Edit seeds manually">
                <ActionIcon
                  variant="light"
                  onClick={startEditing}
                  disabled={isRunning}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <Group gap={4}>
                <Tooltip label="Confirm">
                  <ActionIcon
                    color="green"
                    variant="light"
                    onClick={confirmEdit}
                  >
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
                  <code
                    style={{
                      fontSize: 10,
                      wordBreak: "break-all",
                      textAlign: "center",
                    }}
                  >
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
