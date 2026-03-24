"use client";

import { useContext, useState, useMemo } from "react";
import {
  NumberInput,
  Text,
  Alert,
  Badge,
  Group,
  Paper,
  Stack,
  Button,
  Input,
  Switch,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import LigandContext from "../../../../context/LigandContext";
import TargetContext from "../../../../context/TargetContext";
import PieChart from "../../../../components/tools/toolViz/PieChart";
import JSME from "../../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../../components/tools/toolViz/DropDown";
import { round } from "mathjs";
import RDKitContext from "../../../../context/RDKitContext";
import {
  DmpnnLossEntry,
  useMLResults,
} from "../../../../context/MLResultsContext";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DMPNNConfig {
  atom_dim: number;
  bond_dim: number;
  hidden_dim: number;
  depth: number;
  dropout: number;
  ffn_hidden_dim: number;
  ffn_num_layers: number;
  num_tasks: number;
  task_type: string;
  lr: number;
}

const DEFAULT_CONFIG: DMPNNConfig = {
  atom_dim: 9,
  bond_dim: 3,
  hidden_dim: 300,
  depth: 3,
  dropout: 0.0,
  ffn_hidden_dim: 300,
  ffn_num_layers: 2,
  num_tasks: 1,
  task_type: "regression",
  lr: 0.0001,
};

function computeRecommendedThreshold(values: number[]): number {
  const sorted = [...values]
    .filter((v) => v != null && !isNaN(v))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? parseFloat(sorted[mid].toFixed(2))
    : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DMPNNPage() {
  const { rdkit } = useContext(RDKitContext);
  const { ligand } = useContext(LigandContext);
  const { target } = useContext(TargetContext);

  // All persistent/cross-navigation state lives in context
  const {
    dmpnnLossHistory,
    setDmpnnLossHistory,
    dmpnnTraining,
    setDmpnnTraining,
    dmpnnOneOffResult,
    setDmpnnOneOffResult,
    dmpnnWeightsReady,
    classicalModelReady,
  } = useMLResults();

  // Ephemeral form state — fine to stay local, doesn't need to survive navigation
  const [config, setConfig] = useState<DMPNNConfig>(DEFAULT_CONFIG);
  const [epochs, setEpochs] = useState(20);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [oneOffSMILES, setOneOffSMILES] = useState("CCO");

  const [useCV, setUseCV] = useState(false);
  const [nSplits, setNSplits] = useState(5);

  // ── Activity values + threshold ──────────────────────────────────────────────
  const activityValues = useMemo<number[]>(() => {
    if (!target?.activity_columns?.[0]) return [];
    return ligand
      .map((obj) => Number(obj[target.activity_columns[0]]))
      .filter((v) => !isNaN(v));
  }, [ligand, target]);

  const recommendedThreshold = useMemo(
    () => computeRecommendedThreshold(activityValues),
    [activityValues],
  );
  const effectiveThreshold = threshold ?? recommendedThreshold;

  const pieData = useMemo(() => {
    if (activityValues.length === 0 || config.task_type !== "classification")
      return [];
    const active = activityValues.filter((v) => v >= effectiveThreshold).length;
    const inactive = activityValues.length - active;
    return [
      { key: `Active (≥ ${effectiveThreshold})`, value: active },
      { key: `Inactive (< ${effectiveThreshold})`, value: inactive },
    ];
  }, [activityValues, effectiveThreshold, config.task_type]);

  const activeCount = pieData[0]?.value ?? 0;
  const inactiveCount = pieData[1]?.value ?? 0;
  const total = activityValues.length;
  const activePct = total > 0 ? ((activeCount / total) * 100).toFixed(1) : "0";
  const inactivePct =
    total > 0 ? ((inactiveCount / total) * 100).toFixed(1) : "0";

  // ── Actions — post to shared RDKit worker, DashboardInner handles responses ──
  // Replace onTrain:
  function onTrain() {
    if (!rdkit) return;
    setDmpnnTraining(true);
    setDmpnnLossHistory([]);

    let y = ligand.map((obj) => Number(obj[target.activity_columns[0]]));
    if (config.task_type === "classification") {
      y = y.map((v) => (v >= effectiveThreshold ? 1 : 0));
    }

    const base = {
      smiles: ligand.map((mol) => mol.canonical_smiles),
      labels: y,
      config: { ...config, task_type: target.machine_learning_inference_type },
      epochs,
      ids: ligand.map((mol) => mol.id ?? mol.name ?? ""),
    };

    rdkit.postMessage(
      useCV
        ? { function: "DMPNN_train_kfold", ...base, n_splits: nSplits }
        : { function: "DMPNN_train", ...base },
    );
  }

  function onOneOffPredict() {
    if (!rdkit) return;
    rdkit.postMessage({ function: "dmpnn_infer_one", smiles: oneOffSMILES });
  }

  function onSaveWeights() {
    if (!rdkit) return;
    rdkit.postMessage({ function: "dmpnn_get_weights" });
  }

  function onLoadWeights(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !rdkit) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
      rdkit.postMessage({ function: "dmpnn_load_weights", bytes });
    };
    reader.readAsArrayBuffer(file);
  }

  const hasResults = dmpnnLossHistory.length > 0;
  const lastEntry = dmpnnLossHistory[dmpnnLossHistory.length - 1];
  const lossValues = dmpnnLossHistory.map((e) => e.avg_loss);
  const maxLoss = Math.max(...lossValues);
  const minLoss = Math.min(...lossValues);
  const lossRange = maxLoss - minLoss || 1;
  const W = dmpnnLossHistory.length;
  const lastLoss = dmpnnLossHistory[dmpnnLossHistory.length - 1];

  function phaseLabel(entry: DmpnnLossEntry | undefined) {
    if (!entry) return "";
    if (entry.fold === null) return `Epoch ${entry.epoch}`;
    if (entry.fold === nSplits) return `Final model — epoch ${entry.epoch}`;
    return `Fold ${entry.fold + 1} — epoch ${entry.epoch}`;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="tools-container">
      {/* ── Header ── */}
      <Group>
        <h3>D-MPNN (Chemprop-style)</h3>
        <Badge color="grape" variant="light">
          Graph Neural Network
        </Badge>
        {hasResults && (
          <Button
            variant="light"
            color="gray"
            onClick={() => {
              setDmpnnLossHistory([]);
              setDmpnnOneOffResult(null);
            }}
          >
            Clear Results
          </Button>
        )}
      </Group>

      <details open={!hasResults}>
        <summary>{hasResults && <>Reveal Training Forms</>}</summary>

        <Stack gap="md" mt="md">
          {/* ── Classification threshold ── */}
          {config.task_type === "classification" && (
            <Stack gap="sm">
              <Alert
                icon={<IconInfoCircle size={16} />}
                title="Activity threshold"
                color="blue"
                variant="light"
              >
                <Text size="sm">
                  Values <strong>≥ threshold</strong> →{" "}
                  <Badge color="green" size="sm">
                    Active (1)
                  </Badge>{" "}
                  Values <strong>{"<"} threshold</strong> →{" "}
                  <Badge color="red" size="sm">
                    Inactive (0)
                  </Badge>
                </Text>
              </Alert>
              <Group align="flex-end" gap="sm">
                <NumberInput
                  label="Activity threshold"
                  description={`Recommended (median): ${recommendedThreshold}`}
                  placeholder={String(recommendedThreshold)}
                  value={threshold ?? ""}
                  onChange={(v) =>
                    setThreshold(v === "" || v === null ? null : Number(v))
                  }
                  style={{ width: 260 }}
                />
                {threshold === null && (
                  <Badge color="blue" variant="light" mb={4}>
                    Using recommended: {recommendedThreshold}
                  </Badge>
                )}
              </Group>
              {pieData.length > 0 && (
                <Paper withBorder p="sm" radius="md" style={{ maxWidth: 480 }}>
                  <Group align="center" gap="xl">
                    <PieChart data={pieData} width={220} height={220} />
                    <Stack gap={6}>
                      <Group gap={6}>
                        <Badge color="green" variant="filled">
                          {activeCount}
                        </Badge>
                        <Text size="sm">Active ({activePct}%)</Text>
                      </Group>
                      <Group gap={6}>
                        <Badge color="red" variant="filled">
                          {inactiveCount}
                        </Badge>
                        <Text size="sm">Inactive ({inactivePct}%)</Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Total: {total} compounds
                      </Text>
                      {Math.abs(activeCount - inactiveCount) / total > 0.3 && (
                        <Text size="xs" c="orange">
                          ⚠ Imbalanced — adjust threshold
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Paper>
              )}
            </Stack>
          )}

          {/* ── Architecture ── */}
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Model Architecture
            </Text>
            <Group grow>
              <NumberInput
                label="Hidden dim"
                description="Message-passing hidden size"
                value={config.hidden_dim}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, hidden_dim: Number(v) }))
                }
                min={32}
                max={1024}
                step={32}
              />
              <NumberInput
                label="Depth (T)"
                description="Message-passing steps"
                value={config.depth}
                onChange={(v) => setConfig((c) => ({ ...c, depth: Number(v) }))}
                min={1}
                max={8}
              />
              <NumberInput
                label="FFN hidden dim"
                description="FFN layer width"
                value={config.ffn_hidden_dim}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, ffn_hidden_dim: Number(v) }))
                }
                min={32}
                max={1024}
                step={32}
              />
              <NumberInput
                label="FFN layers"
                description="Depth of FFN"
                value={config.ffn_num_layers}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, ffn_num_layers: Number(v) }))
                }
                min={1}
                max={6}
              />
            </Group>
          </Paper>

          {/* ── Training ── */}
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Training
            </Text>
            <Group grow>
              <NumberInput
                label="Epochs"
                value={epochs}
                onChange={(v) => setEpochs(Number(v))}
                min={1}
                max={500}
              />
              <NumberInput
                label="Learning rate"
                value={config.lr}
                onChange={(v) => setConfig((c) => ({ ...c, lr: Number(v) }))}
                decimalScale={6}
                step={0.0001}
                min={0.000001}
                max={0.1}
              />
            </Group>
            <Group mt="sm" align="flex-end" gap="sm">
              <Switch
                label="K-Fold Cross Validation"
                description="Slower but gives generalisation metrics"
                checked={useCV}
                onChange={(e) => setUseCV(e.currentTarget.checked)}
                color="grape"
              />
              {useCV && (
                <NumberInput
                  label="Folds"
                  value={nSplits}
                  onChange={(v) => setNSplits(Number(v))}
                  min={2}
                  max={10}
                  style={{ width: 100 }}
                />
              )}
            </Group>
          </Paper>

          {/* ── Weights I/O ── */}
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Weights
            </Text>
            <Group>
              <Button
                variant="light"
                onClick={onSaveWeights}
                disabled={!dmpnnWeightsReady}
              >
                Download weights (.safetensors)
              </Button>
              <label>
                <Button variant="light" component="span">
                  Load pretrained weights
                </Button>
                <input
                  type="file"
                  accept=".safetensors"
                  style={{ display: "none" }}
                  onChange={onLoadWeights}
                />
              </label>
            </Group>
          </Paper>

          {/* ── Train button ── */}
          <Button
            onClick={onTrain}
            loading={dmpnnTraining}
            disabled={dmpnnTraining || ligand.length === 0}
            color="grape"
            size="md"
          >
            {dmpnnTraining
              ? `Training... (epoch ${dmpnnLossHistory.length}/${
                  useCV ? `${epochs} × ${nSplits} folds + final` : epochs
                })`
              : `Train D-MPNN${useCV ? ` (${nSplits}-fold CV)` : ""}`}
          </Button>
        </Stack>
      </details>

      {/* ── Loss curve ── */}
      {hasResults && (
        <Stack mt="md" gap="md">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={600}>Training Loss — {phaseLabel(lastEntry)}</Text>
              <Text size="sm" c="dimmed">
                latest: {lastEntry?.avg_loss.toFixed(4)}
              </Text>
            </Group>

            <svg
              width="100%"
              height={140}
              viewBox={`0 0 ${Math.max(W, 1)} ${lossRange}`}
              preserveAspectRatio="none"
              style={{ display: "block" }}
            >
              {/* ── Fold boundary markers ── */}
              {dmpnnLossHistory.map((entry, i) => {
                // Draw a vertical rule at the first step of each new fold/phase
                const prev = dmpnnLossHistory[i - 1];
                const isNewPhase = i > 0 && entry.fold !== prev?.fold;
                if (!isNewPhase) return null;
                return (
                  <line
                    key={i}
                    x1={i}
                    y1={0}
                    x2={i}
                    y2={lossRange}
                    stroke="#a78bfa"
                    strokeWidth={lossRange * 0.015}
                    strokeDasharray={`${lossRange * 0.05} ${lossRange * 0.03}`}
                    opacity={0.6}
                  />
                );
              })}

              {/* ── Loss curve ── */}
              <polyline
                fill="none"
                stroke="#8b5cf6"
                strokeWidth={lossRange * 0.02}
                points={dmpnnLossHistory
                  .map((e, i) => `${i},${maxLoss - e.avg_loss}`)
                  .join(" ")}
              />
            </svg>

            {/* ── Phase legend (only shown during/after CV) ── */}
            {useCV && dmpnnLossHistory.some((e) => e.fold !== null) && (
              <Group gap="lg" mt="xs">
                {Array.from(
                  new Set(
                    dmpnnLossHistory.map((e) =>
                      e.fold === null
                        ? "Training"
                        : e.fold === nSplits
                          ? "Final model"
                          : `Fold ${e.fold + 1}`,
                    ),
                  ),
                ).map((label) => (
                  <Text key={label} size="xs" c="dimmed">
                    {label}
                  </Text>
                ))}
                <Text size="xs" c="dimmed">
                  — dashed lines = phase boundaries
                </Text>
              </Group>
            )}
          </Paper>

          {/* ── One-off prediction ── */}
          <Stack gap="sm">
            <h2>Predict single molecule</h2>
            <Group>
              <Input
                style={{ width: "20%" }}
                value={oneOffSMILES}
                onChange={(e) => setOneOffSMILES(e.target.value)}
                placeholder="SMILES string"
              />
              <Dropdown buttonText="Draw molecule">
                <JSME
                  width="300px"
                  height="300px"
                  onChange={(smiles) => setOneOffSMILES(smiles)}
                />
              </Dropdown>
              <Button onClick={onOneOffPredict} color="grape">
                Predict Activity
              </Button>
            </Group>

            {dmpnnOneOffResult !== null && (
              <Text fw={600}>
                {config.task_type === "regression"
                  ? `Predicted ${target.activity_columns?.[0]}: ${round(dmpnnOneOffResult, 4)}`
                  : `Active probability: ${round(dmpnnOneOffResult, 4)}`}
              </Text>
            )}
          </Stack>
        </Stack>
      )}
    </div>
  );
}
