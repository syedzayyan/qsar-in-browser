"use client";

import { useContext, useState, useCallback } from "react";
import {
  Button, Card, Group, Stack, Title, Text, Badge,
  Progress, Table, SimpleGrid, Divider, Paper, NumberInput, Select, Flex,
  Textarea, ActionIcon, Tooltip, Loader,
} from "@mantine/core";
import { IconPlayerPlay, IconRefresh, IconDownload, IconEdit, IconCheck, IconX } from "@tabler/icons-react";
import { useGAContext } from "../../../context/GAContext";
import RDKitContext from "../../../context/RDKitContext";
import MoleculeStructure from "../../../components/tools/toolComp/MoleculeStructure";
import { readFpSettings } from "../../../components/utils/get_fp_settings";

const DEFAULT_SMILES = ["CCO", "CC(=O)C", "Nc1ccccc1", "CC1=CC=CC=C1", "c1ccncc1"];
const ZINC_URL = "https://raw.githubusercontent.com/AustinT/mol_ga/refs/heads/main/mol_ga/data/zinc250k.smiles";
const ZINC_SAMPLE_SIZE = 20;

export default function GenerativeMol() {
  const { gaState, setGAState } = useGAContext();
  const { rdkit } = useContext(RDKitContext);

  const [settings, setSettings] = useState({
    maxGenerations: 5,
    modelKind: "regression" as "regression" | "classification",
  });

  const [seedSmiles, setSeedSmiles] = useState<string[]>(DEFAULT_SMILES);
  const [editingSeeds, setEditingSeeds] = useState(false);
  const [seedDraft, setSeedDraft] = useState("");
  const [loadingZinc, setLoadingZinc] = useState(false);
  const [zincError, setZincError] = useState<string | null>(null);

  const isRunning = gaState.isRunning;
  const hasResults = !isRunning && gaState.population.length > 0;

  const startEditing = () => {
    try {
      setSeedDraft(seedSmiles.join(", "));
      setEditingSeeds(true);
    } catch (e) {
      console.error("Error starting seed edit:", e);
    }
  };

  const confirmEdit = () => {
    try {
      const parsed = seedDraft
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parsed.length > 0) setSeedSmiles(parsed);
      setEditingSeeds(false);
    } catch (e) {
      console.error("Error confirming seed edit:", e);
      setZincError("Failed to parse SMILES");
    }
  };

  const cancelEdit = () => {
    try {
      setEditingSeeds(false);
    } catch (e) {
      console.error("Error canceling seed edit:", e);
    }
  };

  const sampleFromZinc = useCallback(async () => {
    setLoadingZinc(true);
    setZincError(null);
    try {
      const res = await fetch(ZINC_URL);
      if (!res.ok) throw new Error(`Failed to fetch ZINC: ${res.status}`);
      const text = await res.text();
      const all = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const sampled: string[] = [];
      for (let i = 0; i < all.length; i++) {
        if (sampled.length < ZINC_SAMPLE_SIZE) {
          sampled.push(all[i]);
        } else {
          const j = Math.floor(Math.random() * (i + 1));
          if (j < ZINC_SAMPLE_SIZE) sampled[j] = all[i];
        }
      }
      setSeedSmiles(sampled);
    } catch (e: any) {
      console.error("Error sampling from ZINC:", e);
      setZincError(e.message || "Failed to sample from ZINC");
    } finally {
      setLoadingZinc(false);
    }
  }, []);

  const startGA = useCallback(() => {
    try {
      if (isRunning || !rdkit || seedSmiles.length === 0) return;


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
        modelKind: settings.modelKind,
        ...readFpSettings(),
      });
    } catch (e) {
      console.error("Error starting GA:", e);
      setGAState({
        isRunning: false,
        gen: 0,
        bestScore: 0,
        bestSmiles: "",
        population: [],
        scores: [],
      });
    }
  }, [isRunning, rdkit, settings, seedSmiles, setGAState]);

  const resetGA = useCallback(() => {
    try {
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
    } catch (e) {
      console.error("Error resetting GA:", e);
      setGAState({
        isRunning: false,
        gen: 0,
        bestScore: 0,
        bestSmiles: "",
        population: [],
        scores: [],
      });
    }
  }, [rdkit, setGAState]);

  const statusColor = isRunning ? "yellow" : hasResults ? "green" : "gray";
  const gaStatus = isRunning
    ? `Generation ${gaState.gen}/${settings.maxGenerations}`
    : hasResults ? "Complete!" : "Idle";

  const topResults = hasResults
    ? gaState.population.slice(0, 10).map((smi, idx) => ({
      rank: idx + 1,
      smiles: smi,
      score: gaState.scores[idx]?.toFixed(4) ?? "N/A",
    }))
    : [];

  const bestScore = hasResults && gaState.scores.length > 0
    ? Math.max(...gaState.scores).toFixed(4)
    : null;

  return (
    <Stack gap="xl" p="md" h="100%">
      <div>
        <Group justify="apart">
          <Title order={1}>Generative Chemistry</Title>
          <Badge color={statusColor}>{gaStatus}</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Genetic Algorithm for molecule optimization using RDKit.js + ML scoring
        </Text>
      </div>

      <Card withBorder p="lg" radius="md">
        <Stack>
          <Group justify="apart" mb="md">
            <Title order={4}>GA Controls</Title>
            <Group>
              <Button
                leftSection={<IconPlayerPlay size={18} />}
                onClick={startGA}
                disabled={isRunning || !rdkit || seedSmiles.length === 0}
                loading={isRunning}
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
            <Group grow>
              <NumberInput
                label="Generations"
                value={settings.maxGenerations}
                onChange={(val) => setSettings((s) => ({ ...s, maxGenerations: Number(val) || 5 }))}
                min={1}
                max={100}
                disabled={isRunning}
              />
              <Select
                label="Model"
                value={settings.modelKind}
                onChange={(val) => setSettings((s) => ({ ...s, modelKind: val as any }))}
                data={[
                  { value: "regression", label: "Regression" },
                  { value: "classification", label: "Classification" },
                ]}
                disabled={isRunning}
              />
            </Group>
          </Paper>
        </Stack>
      </Card>

      {isRunning && (
        <Card withBorder p="lg" radius="md">
          <Stack gap="xs">
            <Group justify="apart">
              <Text fw={500}>Progress</Text>
              <Badge color="blue">Live</Badge>
            </Group>
            <Progress value={((gaState.gen + 1) / settings.maxGenerations) * 100} striped animated />
            <Group justify="apart">
              <Text size="sm" c="dimmed">Best Score: <strong>{gaState.bestScore?.toFixed(4) || 0}</strong></Text>
              <Text size="sm" c="dimmed">Generation: <strong>{gaState.gen}</strong></Text>
            </Group>
            {gaState.bestSmiles && (
              <Paper p="xs" withBorder>
                <Text size="xs" c="dimmed">Best SMILES: <code>{gaState.bestSmiles}</code></Text>
              </Paper>
            )}
          </Stack>
        </Card>
      )}

      {hasResults && (
        <Card withBorder p="lg" radius="md">
          <Title order={4} mb="md">Final Results (Top 10)</Title>
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
                    <Table.Td><code style={{ fontSize: 11 }}>{smiles}</code></Table.Td>
                    <Table.Td>
                      <Text size="sm" c={rank === 1 ? "green" : "dimmed"} fw={500}>{score}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
          <Divider my="md" />
          <Group justify="apart">
            <Text size="sm" c="dimmed">Total: <strong>{gaState.population.length}</strong> molecules</Text>
            {bestScore !== null && (
              <Text size="sm" c="green" fw={500}>Best: <strong>{bestScore}</strong></Text>
            )}
          </Group>
        </Card>
      )}

      <Card withBorder p="md" radius="md">
        <Group justify="apart" mb="xs">
          <div>
            <Title order={5}>Seed Dataset</Title>
            <Text size="xs" c="dimmed">{seedSmiles.length} molecules</Text>
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
          <Text size="xs" c="red" mb="xs">{zincError}</Text>
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
                  <code style={{ fontSize: 10, wordBreak: "break-all", textAlign: "center" }}>{smi}</code>
                </Flex>
              </Paper>
            ))}
            {seedSmiles.length > 20 && (
              <Paper p="xs" withBorder>
                <Flex align="center" justify="center" h="100%">
                  <Text size="xs" c="dimmed">+{seedSmiles.length - 20} more</Text>
                </Flex>
              </Paper>
            )}
          </SimpleGrid>
        )}
      </Card>
    </Stack>
  );
}