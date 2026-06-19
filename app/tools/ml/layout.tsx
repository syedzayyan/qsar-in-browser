"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import PyodideContext from "../../../context/PyodideContext";
import TargetContext from "../../../context/TargetContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../components/tools/toolViz/DropDown";
import {
  Alert,
  Badge,
  Button,
  Group,
  Input,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import FoldMetricBarplot from "../../../components/tools/toolViz/BarChart";
import DiscreteScatterplot from "../../../components/tools/toolViz/DiscreteScatterPlot";
import PieChart from "../../../components/tools/toolViz/PieChart";
import { round } from "mathjs";
import NotificationContext from "../../../context/NotificationContext";
import { readFpSettingsAsFormStuff } from "../../../components/utils/get_fp_settings";
import LigandContext from "../../../context/LigandContext";
import RDKitContext from "../../../context/RDKitContext";

function computeRecommendedThreshold(values: number[]): number {
  const sorted = [...values].filter((v) => !isNaN(v)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? parseFloat(sorted[mid].toFixed(2))
    : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

// Export so DMPNNPage + RF + XGB can read the threshold without re-deriving it
export const ThresholdContext = React.createContext<{
  effectiveThreshold: number;
  recommendedThreshold: number;
}>({ effectiveThreshold: 0, recommendedThreshold: 0 });

export default function MLLayout({ children }) {
  const [oneOffSMILES, setOneOffSmiles] = useState("CCO");
  const [oneOffSMILESResult, setOneOffSmilesResult] = useState<number>();
  const [threshold, setThreshold] = useState<number | null>(null);
  const { rdkit } = useContext(RDKitContext);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const { pyodide } = useContext(PyodideContext);
  const { setLigand, ligand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);
  const { pushNotification } = useContext(NotificationContext);

  const isClassification =
    target.machine_learning_inference_type === "classification";

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = oneOffSMILES;
  }, [oneOffSMILES]);

  // ── Threshold + pie ────────────────────────────────────────────────────────
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
    if (!activityValues.length || !isClassification) return [];
    const active = activityValues.filter((v) => v >= effectiveThreshold).length;
    const inactive = activityValues.length - active;
    return [
      { key: `Active (≥ ${effectiveThreshold})`, value: active },
      { key: `Inactive (< ${effectiveThreshold})`, value: inactive },
    ];
  }, [activityValues, effectiveThreshold, isClassification]);

  const activeCount = pieData[0]?.value ?? 0;
  const inactiveCount = pieData[1]?.value ?? 0;
  const total = activityValues.length;
  const activePct = total > 0 ? ((activeCount / total) * 100).toFixed(1) : "0";
  const inactivePct =
    total > 0 ? ((inactiveCount / total) * 100).toFixed(1) : "0";

  // ── Results ────────────────────────────────────────────────────────────────
  const hasResults = target.machine_learning?.length > 0;
  const metric1 = hasResults ? target.machine_learning[0] : [];
  const metric2 = hasResults ? target.machine_learning[1] : [];
  const perFoldPreds = hasResults ? target.machine_learning[2] : [];

  const { mergedData, foldColorProperty, hoverSmiles, compoundIds } =
    useMemo(() => {
      const mergedData: { x: number; y: number }[] = [];
      const foldColorProperty: string[] = [];
      const hoverSmiles: string[] = [];
      const compoundIds: string[] = [];
      perFoldPreds.forEach((fold, foldIndex) => {
        fold.forEach((point) => {
          mergedData.push({ x: point.x, y: point.y });
          foldColorProperty.push(`Fold ${foldIndex + 1}`);
          hoverSmiles.push(point.smiles ?? "");
          compoundIds.push(point.id ?? "");
        });
      });
      return { mergedData, foldColorProperty, hoverSmiles, compoundIds };
    }, [perFoldPreds]);

  // ── Classical FP one-off predict ──────────────────────────────────────────
  async function oneOffPred() {
    const requestId = `machine_learning_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    pushNotification({
      message: "Processing one-off prediction...",
      type: "success",
      id: requestId,
      done: false,
      autoClose: true,
    });

    rdkit.postMessage({
      function: "only_fingerprint",
      id: requestId,
      mol_data: [{ canonical_smiles: oneOffSMILES }],
      activity_columns: target.activity_columns,
      formStuff: readFpSettingsAsFormStuff(),
    });

    rdkit.onmessage = async (event) => {
      const { id: evtId, function: evtFunc, results, error } = event.data;
      if (evtId !== requestId || evtFunc !== "only_fingerprint") return;
      if (error || !results?.[0]?.fingerprint) return;
      pyodide.postMessage({
        id: requestId,
        opts: isClassification ? 2 : 1,
        fp: [results[0].fingerprint],
        func: "ml_screen",
        params: { model: isClassification ? 2 : 1 },
      });
      pyodide.onmessage = (e) => {
        if (e.data.id !== requestId) return;
        setOneOffSmilesResult(e.data.result[0]);
      };
    };
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="tools-container">
      {/* ── Task type selector (shared, drives everything) ── */}
      <Group>
        <h3>ML Task Type</h3>
        <Select
          value={target.machine_learning_inference_type}
          onChange={(v) =>
            setTarget({ ...target, machine_learning_inference_type: v })
          }
          data={[
            { value: "regression", label: "Regression" },
            { value: "classification", label: "Classification" },
          ]}
          style={{ flex: 1 }}
          disabled={hasResults}
        />
        {hasResults && (
          <Button
            variant="light"
            color="gray"
            onClick={() => {
              setTarget({
                ...target,
                machine_learning: [],
                machine_learning_inference_type: "regression",
              });
              setOneOffSmilesResult(undefined);
              setThreshold(null);
              setLigand((prev) => prev.map(({ predictions, ...rest }) => rest));
            }}
          >
            Clear Results
          </Button>
        )}
      </Group>

      {/* ── Threshold + pie (shared across ALL ML methods when classification) ── */}
      {isClassification && (
        <Stack my="md" gap="sm">
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
              · Values <strong>{"<"} threshold</strong> →{" "}
              <Badge color="red" size="sm">
                Inactive (0)
              </Badge>
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Recommended value is the median ({recommendedThreshold}). If your
              CSV already has 0/1 labels, leave this empty.
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

      {/* ── Child ML form (RF page, XGB page, DMPNN page — no threshold/pie inside) ── */}
      <details open={!hasResults}>
        <summary>{hasResults && <>Reveal ML Forms</>}</summary>
        {/* Pass threshold down via context so children can read effectiveThreshold */}
        <ThresholdContext.Provider
          value={{ effectiveThreshold, recommendedThreshold }}
        >
          {children}
        </ThresholdContext.Provider>
      </details>

      {/* ── Results + charts ── */}
      {hasResults && (
        <>
          {/* Classical FP one-off predict (RF/XGB) */}
          <Group mt="md">
            <h2>Predict single molecule activity</h2>
            <Input
              ref={inputRef}
              style={{ width: "20%" }}
              onChange={(e) => setOneOffSmiles(e.target.value)}
              placeholder="SMILES string"
            />
            <Dropdown buttonText="Draw molecule">
              <JSME
                width="300px"
                height="300px"
                onChange={(smiles) => setOneOffSmiles(smiles)}
              />
            </Dropdown>
            <Button onClick={oneOffPred}>Predict Activity</Button>
            {oneOffSMILESResult !== undefined && (
              <Text fw={600}>
                {isClassification
                  ? `Active probability: ${round(oneOffSMILESResult, 4)}`
                  : `Predicted ${target.activity_columns?.[0]}: ${round(oneOffSMILESResult, 2)}`}
              </Text>
            )}
          </Group>

          {/* Charts */}
          {!isClassification && (
            <>
              <DiscreteScatterplot
                data={mergedData}
                discreteColor
                colorLabels={foldColorProperty}
                xAxisTitle="Experimental Activity"
                yAxisTitle="Predicted Activity"
                hoverProp={hoverSmiles}
                id={compoundIds}
              />
              <FoldMetricBarplot
                metricName="Mean Absolute Error"
                data={metric1}
                color="#3b82f6"
              />
            </>
          )}
          {isClassification && (
            <Group align="flex-start">
              <FoldMetricBarplot
                metricName="Accuracy"
                data={metric1}
                color="#3b82f6"
              />
              <FoldMetricBarplot
                metricName="ROC-AUC Score"
                data={metric2}
                color="#f59e0b"
              />
            </Group>
          )}
        </>
      )}
    </div>
  );
}
