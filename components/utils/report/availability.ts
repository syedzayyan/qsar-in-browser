// Single source of truth for "what's already been computed this session",
// shared by the report-setup modal (which lets the user fill gaps in before
// generating) and the PDF builder itself (which lists any gaps left).
import type { targetType } from "../../../context/TargetContext";

export interface MLSnapshot {
  screenData: any[];
  classicalModelReady: boolean;
  dmpnnWeightsReady: boolean;
  dmpnnLossHistory: { epoch: number; avg_loss: number; fold: number | null }[];
}

export interface Availability {
  activityCol?: string;
  activityValues: number[];
  hasActivity: boolean;
  hasPCA: boolean;
  hasTSNE: boolean;
  hasClassical: boolean;
  hasDmpnn: boolean;
  hasScreening: boolean;
}

// PCA/t-SNE coordinates come back from the Pyodide worker via `.toJs()`,
// which can produce typed arrays (e.g. Float64Array) for numeric rows rather
// than plain JS Arrays — Array.isArray() on those is false even though
// indexing (l.pca[0]/[1]) works fine. Check for array-likeness instead.
export function isCoordPair(v: any): boolean {
  return v != null && typeof v.length === "number" && v.length >= 2 && typeof v[0] === "number";
}

export function computeAvailability(
  target: targetType,
  ligand: Record<string, any>[],
  ml: MLSnapshot,
): Availability {
  const activityCol = target.activity_columns?.[0];
  const activityValues = activityCol
    ? ligand.map((l) => Number(l[activityCol])).filter((v) => !isNaN(v))
    : [];

  return {
    activityCol,
    activityValues,
    hasActivity: activityValues.length > 0,
    hasPCA: ligand.some((l) => isCoordPair(l.pca)),
    hasTSNE: ligand.some((l) => isCoordPair(l.tsne)),
    hasClassical: !!ml.classicalModelReady,
    hasDmpnn: ml.dmpnnLossHistory.length > 0 || ml.dmpnnWeightsReady,
    hasScreening: ml.screenData.length > 0,
  };
}
