"use client";

import React, { useContext, useState } from "react";
import {
  NumberInput,
  Text,
  Badge,
  Group,
  Paper,
  Stack,
  Button,
  Input,
  Switch,
  Checkbox,
} from "@mantine/core";
import LigandContext from "../../../../context/LigandContext";
import TargetContext from "../../../../context/TargetContext";
import JSME from "../../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../../components/tools/toolViz/DropDown";
import { round } from "mathjs";
import RDKitContext from "../../../../context/RDKitContext";
import {
  DmpnnLossEntry,
  useMLResults,
} from "../../../../context/MLResultsContext";
import { ThresholdContext } from "../layout"; // ← shared threshold from MLLayout

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
  atom_dim: 72,
  bond_dim: 14,
  hidden_dim: 300,
  depth: 3,
  dropout: 0.0,
  ffn_hidden_dim: 300,
  ffn_num_layers: 2,
  num_tasks: 1,
  task_type: "regression",
  lr: 0.0001,
};

export default function DMPNNPage() {
  const { rdkit } = useContext(RDKitContext);
  const { ligand } = useContext(LigandContext);
  const { target } = useContext(TargetContext);

  // ── Shared threshold lives in MLLayout, consumed here ──────────────────────
  const { effectiveThreshold } = useContext(ThresholdContext);

  const {
    dmpnnLossHistory,
    setDmpnnLossHistory,
    dmpnnTraining,
    setDmpnnTraining,
    dmpnnOneOffResult,
    setDmpnnOneOffResult,
    dmpnnWeightsReady,
  } = useMLResults();

  const [config, setConfig] = useState<DMPNNConfig>(DEFAULT_CONFIG);
  const [epochs, setEpochs] = useState(20);
  const [oneOffSMILES, setOneOffSMILES] = useState("CCO");
  const [batchSize, setBatchSize] = useState(16);
  const [useBatch, setUseBatch] = useState(true);
  const [useCV, setUseCV] = useState(false);
  const [nSplits, setNSplits] = useState(5);

  // ── Derived display values ──────────────────────────────────────────────────
  const hasResults = dmpnnLossHistory.length > 0;
  const lastEntry = dmpnnLossHistory.at(-1);
  const lossValues = dmpnnLossHistory.map((e) => e.avg_loss);
  const maxLoss = Math.max(...lossValues, 0);
  const minLoss = Math.min(...lossValues, 0);
  const lossRange = maxLoss - minLoss || 1;
  const W = dmpnnLossHistory.length;

  function phaseLabel(entry: DmpnnLossEntry | undefined) {
    if (!entry) return "";
    if (entry.fold === null) return `Epoch ${entry.epoch}`;
    if (entry.fold === nSplits) return `Final model — epoch ${entry.epoch}`;
    return `Fold ${entry.fold + 1} — epoch ${entry.epoch}`;
  }

  // ── Train ───────────────────────────────────────────────────────────────────
  function onTrain() {
    if (!rdkit) return;
    setDmpnnTraining(true);
    setDmpnnLossHistory([]);

    const rawY = ligand.map((obj) => Number(obj[target.activity_columns[0]]));

    // effectiveThreshold comes from MLLayout — no local threshold state needed
    const y =
      target.machine_learning_inference_type === "classification"
        ? rawY.map((v) => (v >= effectiveThreshold ? 1.0 : 0.0))
        : rawY;

    const base = {
      smiles: ligand.map((mol) => mol.canonical_smiles),
      labels: y,
      epochs,
      ids: ligand.map((mol) => mol.id ?? mol.name ?? ""),
      config: {
        ...config,
        task_type: target.machine_learning_inference_type,
        batching: useBatch,
        batch_size: batchSize,
      },
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
      rdkit.postMessage({
        function: "dmpnn_load_weights",
        bytes,
        config: {
          atom_dim: 72,
          bond_dim: 14,
          hidden_dim: config.hidden_dim,
          depth: config.depth,
          dropout: config.dropout,
          ffn_hidden_dim: config.ffn_hidden_dim,
          ffn_num_layers: config.ffn_num_layers,
          num_tasks: 1,
          task_type: target.machine_learning_inference_type,
          lr: config.lr,
        },
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="tools-container">
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

      {/* ── Architecture ── */}
      <Paper withBorder p="md" radius="md" mt="md">
        <Text fw={600} mb="sm">
          Model Architecture
        </Text>
        <Group grow>
          <NumberInput
            label="Hidden dim"
            description="Message-passing hidden size"
            value={config.hidden_dim}
            min={32}
            max={1024}
            step={32}
            onChange={(v) =>
              setConfig((c) => ({ ...c, hidden_dim: Number(v) }))
            }
          />
          <NumberInput
            label="Depth (T)"
            description="Message-passing steps"
            value={config.depth}
            min={1}
            max={8}
            onChange={(v) => setConfig((c) => ({ ...c, depth: Number(v) }))}
          />
          <NumberInput
            label="FFN hidden dim"
            description="FFN layer width"
            value={config.ffn_hidden_dim}
            min={32}
            max={1024}
            step={32}
            onChange={(v) =>
              setConfig((c) => ({ ...c, ffn_hidden_dim: Number(v) }))
            }
          />
          <NumberInput
            label="FFN layers"
            description="Depth of FFN"
            value={config.ffn_num_layers}
            min={1}
            max={6}
            onChange={(v) =>
              setConfig((c) => ({ ...c, ffn_num_layers: Number(v) }))
            }
          />
        </Group>
      </Paper>

      {/* ── Training ── */}
      <Paper withBorder p="md" radius="md" mt="md">
        <Text fw={600} mb="sm">
          Training
        </Text>
        <Group grow>
          <NumberInput
            label="Epochs"
            value={epochs}
            min={1}
            max={500}
            onChange={(v) => setEpochs(Number(v))}
          />
          <NumberInput
            label="Learning rate"
            value={config.lr}
            decimalScale={6}
            step={0.0001}
            min={0.000001}
            max={0.1}
            onChange={(v) => setConfig((c) => ({ ...c, lr: Number(v) }))}
          />
        </Group>
        <Group mt="sm" align="flex-end" gap="sm">
          <Switch
            label="K-Fold Cross Validation"
            description="Slower but gives generalisation metrics"
            checked={useCV}
            color="grape"
            onChange={(e) => setUseCV(e.currentTarget.checked)}
          />
          {useCV && (
            <NumberInput
              label="Folds"
              value={nSplits}
              min={2}
              max={10}
              style={{ width: 100 }}
              onChange={(v) => setNSplits(Number(v))}
            />
          )}
          <Checkbox
            label="Use batch training"
            checked={useBatch}
            onChange={(e) => setUseBatch(e.currentTarget.checked)}
          />
          <NumberInput
            label="Batch size"
            value={batchSize}
            min={1}
            max={128}
            step={16}
            style={{ width: 100 }}
            onChange={(v) => setBatchSize(Number(v))}
          />
        </Group>
      </Paper>

      {/* ── Weights I/O ── */}
      <Paper withBorder p="md" radius="md" mt="md">
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
        mt="md"
        onClick={onTrain}
        loading={dmpnnTraining}
        disabled={dmpnnTraining || ligand.length === 0}
        color="grape"
        size="md"
        fullWidth
      >
        {dmpnnTraining
          ? `Training... (epoch ${dmpnnLossHistory.length}/${useCV ? `${epochs} × ${nSplits} folds + final` : epochs})`
          : `Train D-MPNN${useCV ? ` (${nSplits}-fold CV)` : ""}`}
      </Button>

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
              {dmpnnLossHistory.map((entry, i) => {
                const prev = dmpnnLossHistory[i - 1];
                if (i === 0 || entry.fold === prev?.fold) return null;
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
              <polyline
                fill="none"
                stroke="#8b5cf6"
                strokeWidth={lossRange * 0.02}
                points={dmpnnLossHistory
                  .map((e, i) => `${i},${maxLoss - e.avg_loss}`)
                  .join(" ")}
              />
            </svg>
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

          {/* ── DMPNN-specific one-off predict (uses WASM, not classical FP) ── */}
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Predict single molecule
            </Text>
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
              <Text fw={600} mt="sm">
                {target.machine_learning_inference_type === "regression"
                  ? `Predicted ${target.activity_columns?.[0]}: ${round(dmpnnOneOffResult, 4)}`
                  : `Active probability: ${round(dmpnnOneOffResult, 4)}`}
              </Text>
            )}
          </Paper>
        </Stack>
      )}
    </div>
  );
}
