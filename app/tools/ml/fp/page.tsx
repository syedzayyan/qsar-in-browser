"use client";
import { useContext, useState, useMemo } from "react";
import PyodideContext from "../../../../context/PyodideContext";
import RF from "../../../../components/ml-forms/RF";
import XGB from "../../../../components/ml-forms/XGB";
import {
  Tabs,
  NumberInput,
  Text,
  Alert,
  Badge,
  Group,
  Paper,
  Stack,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import LigandContext from "../../../../context/LigandContext";
import TargetContext from "../../../../context/TargetContext";
import NotificationContext from "../../../../context/NotificationContext";
import PieChart from "../../../../components/tools/toolViz/PieChart";

function computeRecommendedThreshold(values: number[]): number {
  const sorted = [...values]
    .filter((v) => v != null && !isNaN(v))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  // Use median as recommended threshold
  // Fix 1: recommended threshold rounding
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? parseFloat(sorted[mid].toFixed(2))
    : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

export default function RandomForest() {
  const { pyodide } = useContext(PyodideContext);
  const { pushNotification } = useContext(NotificationContext);
  const { ligand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);
  const [threshold, setThreshold] = useState<number | null>(null);

  // Raw activity values from the selected column
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

  // Pie chart data: how many active vs inactive at the current threshold
  const pieData = useMemo(() => {
    if (activityValues.length === 0) return [];
    const active = activityValues.filter((v) => v >= effectiveThreshold).length;
    const inactive = activityValues.length - active;
    return [
      { key: `Active (≥ ${effectiveThreshold})`, value: active },
      { key: `Inactive (< ${effectiveThreshold})`, value: inactive },
    ];
  }, [activityValues, effectiveThreshold]);

  const activeCount = pieData[0]?.value ?? 0;
  const inactiveCount = pieData[1]?.value ?? 0;
  const total = activityValues.length;
  const activePct = total > 0 ? ((activeCount / total) * 100).toFixed(1) : "0";
  const inactivePct =
    total > 0 ? ((inactiveCount / total) * 100).toFixed(1) : "0";

  async function onSubmit(data: any) {
    const requestID = `machine_learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    pushNotification({
      message: "Running Machine Learning...",
      id: requestID,
      type: "info",
      autoClose: false,
    });

    let y = ligand.map((obj) => obj[target.activity_columns[0]]);
    if (
      target.machine_learning_inference_type === "classification" &&
      effectiveThreshold !== null
    ) {
      y = y.map((v) => (v >= effectiveThreshold ? 1 : 0));
    }

    pyodide.postMessage({
      id: requestID,
      func: "ml",
      fp: ligand.map((mol) => mol.fingerprint),
      opts: data.model,
      params: {
        ...data,
        activity_columns: y,
        task_type: target.machine_learning_inference_type,
        threshold: effectiveThreshold,
        smiles: ligand.map((mol) => mol.canonical_smiles), // ← add
        ids: ligand.map((mol) => mol.id ?? mol.canonical_smiles), // ← add
      },
    });
  }

  return (
    <div>
      <h1>Machine Learning</h1>

      {target.machine_learning_inference_type === "classification" && (
        <Stack mb="md" gap="sm">
          {/* ── Explanation alert ── */}
          <Alert
            icon={<IconInfoCircle size={16} />}
            title="What is the activity threshold?"
            color="blue"
            variant="light"
          >
            <Stack gap={4}>
              <Text size="sm">
                The threshold converts your continuous activity values (e.g.
                IC₅₀, pIC₅₀, % inhibition) into binary labels for
                classification:
              </Text>
              <Text size="sm" fw={600}>
                • Value <strong>≥ threshold</strong> →{" "}
                <Badge color="green" size="sm">
                  Active (1)
                </Badge>
                {"  "}• Value <strong>{"<"} threshold</strong> →{" "}
                <Badge color="red" size="sm">
                  Inactive (0)
                </Badge>
              </Text>
              <Text size="sm" c="dimmed">
                The recommended value is the <strong>median</strong> of your
                dataset ({recommendedThreshold}), which gives you a balanced
                50/50 split by default. Raise it to be more selective about what
                counts as "active"; lower it to include more compounds as
                active. If your CSV already contains 0/1 labels, leave this
                empty.
              </Text>
            </Stack>
          </Alert>

          {/* ── Input + recommended badge ── */}
          <Group align="flex-end" gap="sm">
            <NumberInput
              label="Activity threshold"
              description={`Recommended (median): ${recommendedThreshold}`}
              placeholder={String(recommendedThreshold)}
              value={threshold ?? ""}
              onChange={(v) => {
                if (v === null || v === undefined || v === "") {
                  setThreshold(null);
                } else if (typeof v === "number") {
                  setThreshold(v);
                } else {
                  setThreshold(Number(v));
                }
              }}
              style={{ width: 260 }}
            />
            {threshold === null && (
              <Badge color="blue" variant="light" mb={4}>
                Using recommended: {recommendedThreshold}
              </Badge>
            )}
          </Group>

          {/* ── Live pie chart ── */}
          {pieData.length > 0 && (
            <Paper withBorder p="sm" radius="md" style={{ maxWidth: 480 }}>
              <Group gap={8} align="center">
                <Text size="sm" fw={600} component="span">
                  Value <strong>≥ {effectiveThreshold}</strong>
                </Text>
                <Badge color="green" size="sm">
                  Active (1)
                </Badge>
                <Text size="sm" fw={600} component="span" c="dimmed">
                  |
                </Text>
                <Text size="sm" fw={600} component="span">
                  Value{" "}
                  <strong>
                    {"<"} {effectiveThreshold}
                  </strong>
                </Text>
                <Badge color="red" size="sm">
                  Inactive (0)
                </Badge>
              </Group>
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
                      ⚠ Imbalanced dataset — consider adjusting the threshold
                    </Text>
                  )}
                </Stack>
              </Group>
            </Paper>
          )}
        </Stack>
      )}

      {/* ── Models ── */}
      <Tabs defaultValue="random-forest">
        <Tabs.List>
          <Tabs.Tab value="random-forest">Random Forest</Tabs.Tab>
          <Tabs.Tab value="xgboost">XGBoost</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="random-forest">
          <RF
            onSubmit={onSubmit}
            taskType={
              target.machine_learning_inference_type as
                | "classification"
                | "regression"
            }
          />
        </Tabs.Panel>
        <Tabs.Panel value="xgboost">
          <XGB
            onSubmit={onSubmit}
            taskType={
              target.machine_learning_inference_type as
                | "classification"
                | "regression"
            }
          />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
