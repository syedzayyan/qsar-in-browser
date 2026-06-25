import { useState } from "react";
import { Modal, Stack, Text, Checkbox, Button, Group, Badge, Loader } from "@mantine/core";
import type { targetType } from "../../context/TargetContext";
import { computeAvailability } from "../utils/report/availability";
import {
  runPCADefault,
  runTSNEDefault,
  runClassicalMLDefault,
  runDmpnnDefault,
  runScreeningDefault,
} from "../utils/report/runDefaults";
import { generateReportPDF, ReportMLResults } from "../utils/report/buildReport";

type StepKey = "pca" | "tsne" | "classical" | "dmpnn" | "screening";
const STEP_ORDER: StepKey[] = ["pca", "tsne", "classical", "dmpnn", "screening"];
const STEP_LABELS: Record<StepKey, string> = {
  pca: "PCA (Chemical Space)",
  tsne: "t-SNE (Chemical Space)",
  classical: "Classical ML model (Random Forest)",
  dmpnn: "D-MPNN model",
  screening: "Screening (Broad Hub dataset)",
};

interface Snapshot {
  target: targetType;
  ligand: Record<string, any>[];
  ml: ReportMLResults;
}

export default function ReportSetupModal({
  opened,
  onClose,
  target,
  ligand,
  ml,
  rdkit,
  pyodide,
  getLatest,
  pushNotification,
}: {
  opened: boolean;
  onClose: () => void;
  target: targetType;
  ligand: Record<string, any>[];
  ml: ReportMLResults;
  rdkit: any;
  pyodide: any;
  getLatest: () => Snapshot;
  pushNotification: (n: any) => void;
}) {
  const [selected, setSelected] = useState<Partial<Record<StepKey, boolean>>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");

  const availability = computeAvailability(target, ligand, ml);
  const done: Record<StepKey, boolean> = {
    pca: availability.hasPCA,
    tsne: availability.hasTSNE,
    classical: availability.hasClassical,
    dmpnn: availability.hasDmpnn,
    screening: availability.hasScreening,
  };

  const toggle = (key: StepKey) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  async function handleGenerate() {
    setRunning(true);
    const toRun = STEP_ORDER.filter((key) => !done[key] && selected[key]);

    for (let i = 0; i < toRun.length; i++) {
      const key = toRun[i];
      setProgress(`Running ${STEP_LABELS[key]} (${i + 1}/${toRun.length})…`);
      try {
        const latest = getLatest();
        if (key === "pca") await runPCADefault(pyodide, latest.ligand);
        else if (key === "tsne") await runTSNEDefault(pyodide, latest.ligand);
        else if (key === "classical")
          await runClassicalMLDefault(pyodide, latest.target, latest.ligand);
        else if (key === "dmpnn")
          await runDmpnnDefault(rdkit, latest.target, latest.ligand);
        else if (key === "screening")
          await runScreeningDefault(rdkit, () => getLatest().ml);

        // let React flush the context update from the response above
        // before the next step (or the PDF build) reads it back out.
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error(err);
        pushNotification({
          message: `Failed to run ${STEP_LABELS[key]}: ${(err as Error).message}`,
          type: "error",
        });
      }
    }

    setProgress("Generating PDF…");
    try {
      const latest = getLatest();
      await generateReportPDF(latest.target, latest.ligand, latest.ml);
    } catch (err) {
      console.error(err);
      pushNotification({
        message: "Failed to generate report PDF — see console for details.",
        type: "error",
      });
    }

    setRunning(false);
    setProgress("");
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Generate Report"
      closeOnClickOutside={!running}
      withCloseButton={!running}
      size="md"
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          The report covers whatever's already been computed in this session.
          For anything not yet run, you can fill it in with default settings
          before generating.
        </Text>

        {STEP_ORDER.map((key) => (
          <Group key={key} justify="space-between" wrap="nowrap">
            <Text size="sm">{STEP_LABELS[key]}</Text>
            {done[key] ? (
              <Badge color="green" variant="light">
                Done
              </Badge>
            ) : (
              <Checkbox
                label="Run with defaults"
                checked={!!selected[key]}
                onChange={() => toggle(key)}
                disabled={running}
              />
            )}
          </Group>
        ))}

        {running && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm">{progress}</Text>
          </Group>
        )}

        <Button onClick={handleGenerate} loading={running} fullWidth mt="sm">
          Generate Report
        </Button>
      </Stack>
    </Modal>
  );
}
