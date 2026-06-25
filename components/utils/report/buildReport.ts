// Assembles a single PDF report from whatever has already been computed in
// the current session (target/ligand context + ML results). Sections for
// steps that haven't been run yet are skipped and listed under "Sections not
// yet available" rather than guessed at or recomputed.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { targetType } from "../../../context/TargetContext";
import type { DmpnnLossEntry, ScreenMol } from "../../../context/MLResultsContext";
import { initRDKit } from "../rdkit_loader";
import { readFpSettings } from "../get_fp_settings";
import { computeAvailability, isCoordPair } from "./availability";
import {
  buildHistogramSvg,
  buildScatterSvg,
  buildLineSvg,
  buildPieSvg,
  svgElementToPngDataUrl,
  svgStringToPngDataUrl,
} from "./svgRender";

export interface ReportMLResults {
  screenData: ScreenMol[];
  sortedScreenData: ScreenMol[];
  preds: number[];
  screenThreshold: number;
  classicalModelReady: boolean;
  dmpnnWeightsReady: boolean;
  dmpnnLossHistory: DmpnnLossEntry[];
}

const CHART_W = 480;
const CHART_H = 280;

export async function generateReportPDF(
  target: targetType,
  ligand: Record<string, any>[],
  ml: ReportMLResults,
): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const addSectionTitle = (text: string) => {
    ensureSpace(28);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(text, MARGIN, y);
    doc.setFont("helvetica", "normal");
    y += 18;
  };

  const addParagraph = (text: string, size = 10, color = 60) => {
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    ensureSpace(lines.length * 13 + 4);
    doc.text(lines, MARGIN, y);
    y += lines.length * 13 + 6;
    doc.setTextColor(0);
  };

  const addImage = async (
    svgEl: SVGSVGElement,
    naturalW: number,
    naturalH: number,
    maxW = CONTENT_W,
  ) => {
    const dataUrl = await svgElementToPngDataUrl(svgEl, naturalW, naturalH);
    const w = Math.min(maxW, naturalW);
    const h = (w / naturalW) * naturalH;
    ensureSpace(h + 16);
    doc.addImage(dataUrl, "PNG", MARGIN, y, w, h);
    y += h + 16;
  };

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("QSAR In Browser — Analysis Report", MARGIN, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, MARGIN, y);
  doc.setTextColor(0);
  y += 26;

  // ── What's actually available in this session ───────────────────────────
  const {
    activityCol,
    activityValues,
    hasActivity,
    hasPCA,
    hasTSNE,
    hasClassical,
    hasDmpnn,
    hasScreening,
  } = computeAvailability(target, ligand, ml);

  const warnings: string[] = [];
  if (!hasActivity)
    warnings.push("Activity distribution — no activity column found.");
  if (!hasPCA)
    warnings.push("PCA — not yet computed (Chemical Space Maps > PCA).");
  if (!hasTSNE)
    warnings.push("t-SNE — not yet computed (Chemical Space Maps > t-SNE).");
  if (!hasClassical && !hasDmpnn)
    warnings.push(
      "Model evaluation — no model trained yet (Machine Learning).",
    );
  if (!hasScreening)
    warnings.push(
      "Screening — no predictions run yet (Model Predictions > Predict from Dataset).",
    );

  // ── Dataset overview ─────────────────────────────────────────────────────
  addSectionTitle("Dataset Overview");
  const fp = readFpSettings();
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "plain",
    tableWidth: CONTENT_W,
    styles: { fontSize: 10 },
    body: [
      ["Target", target.target_name || "—"],
      ["Organism", target.target_organism || "—"],
      ["Data source", target.data_source || "—"],
      ["Molecules", String(ligand.length)],
      ["Activity column", activityCol || "—"],
      ["Task type", target.machine_learning_inference_type || "—"],
      ["Fingerprint (from preprocessing)", String(fp.fingerprint)],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  if (warnings.length) {
    addSectionTitle("Sections not yet available");
    addParagraph(
      "These steps haven't been run in this session, so they're omitted below:",
    );
    warnings.forEach((w) => addParagraph(`•  ${w}`));
    y += 4;
  }

  // ── Activity distribution ────────────────────────────────────────────────
  if (hasActivity) {
    addSectionTitle("Activity Distribution");
    const svg = buildHistogramSvg(activityValues, CHART_W, CHART_H, activityCol, "Count");
    await addImage(svg, CHART_W, CHART_H);
  }

  // ── Chemical space ───────────────────────────────────────────────────────
  if (hasPCA || hasTSNE) addSectionTitle("Chemical Space");

  if (hasPCA) {
    const withPca = ligand.filter((l) => isCoordPair(l.pca));
    const pts = withPca.map((l) => ({ x: l.pca[0], y: l.pca[1] }));
    const colors = hasActivity
      ? withPca.map((l) => Number(l[activityCol!]))
      : undefined;
    const variance = target.pca_explained_variance;
    addParagraph(
      `PCA${
        variance
          ? ` — explained variance: PC1 ${(variance[0] * 100).toFixed(1)}%, PC2 ${(variance[1] * 100).toFixed(1)}%`
          : ""
      }`,
    );
    const svg = buildScatterSvg(pts, colors, CHART_W, CHART_H, "PC1", "PC2");
    await addImage(svg, CHART_W, CHART_H);
  }

  if (hasTSNE) {
    const withTsne = ligand.filter((l) => isCoordPair(l.tsne));
    const pts = withTsne.map((l) => ({ x: l.tsne[0], y: l.tsne[1] }));
    const colors = hasActivity
      ? withTsne.map((l) => Number(l[activityCol!]))
      : undefined;
    addParagraph("t-SNE");
    const svg = buildScatterSvg(pts, colors, CHART_W, CHART_H, "t-SNE 1", "t-SNE 2");
    await addImage(svg, CHART_W, CHART_H);
  }

  // ── Sample structures ────────────────────────────────────────────────────
  const withSmiles = ligand.filter((l) => l.canonical_smiles);
  if (withSmiles.length > 0) {
    addSectionTitle(
      hasActivity ? "Sample Structures (top by activity)" : "Sample Structures",
    );
    const sample = [...withSmiles]
      .sort((a, b) =>
        hasActivity ? Number(b[activityCol!]) - Number(a[activityCol!]) : 0,
      )
      .slice(0, 9);
    await addMoleculeGrid(doc, sample, activityCol, MARGIN, CONTENT_W, ensureSpace, () => y, (v) => (y = v));
    y += 10;
  }

  // ── Model evaluation ──────────────────────────────────────────────────────
  addSectionTitle("Model Evaluation");
  if (!hasClassical && !hasDmpnn) {
    addParagraph("No model has been trained in this session.", 10, 130);
  }
  if (hasClassical) {
    addParagraph("Classical ML model (Random Forest / XGBoost): trained and ready for screening.");
  }
  if (hasDmpnn) {
    const simple = ml.dmpnnLossHistory.filter((e) => e.fold === null);
    let lossPoints: { x: number; y: number }[] = [];
    let lossNote = "";
    if (simple.length > 0) {
      lossPoints = simple.map((e) => ({ x: e.epoch, y: e.avg_loss }));
    } else if (ml.dmpnnLossHistory.length > 0) {
      const byEpoch = new Map<number, number[]>();
      ml.dmpnnLossHistory.forEach((e) => {
        if (!byEpoch.has(e.epoch)) byEpoch.set(e.epoch, []);
        byEpoch.get(e.epoch)!.push(e.avg_loss);
      });
      lossPoints = Array.from(byEpoch.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([epoch, vals]) => ({
          x: epoch,
          y: vals.reduce((a, b) => a + b, 0) / vals.length,
        }));
      lossNote = " (averaged across cross-validation folds)";
    }

    if (lossPoints.length > 0) {
      addParagraph(
        `D-MPNN training loss${lossNote} — final epoch loss: ${lossPoints[lossPoints.length - 1].y.toFixed(4)}`,
      );
      const svg = buildLineSvg(lossPoints, CHART_W, CHART_H, "Epoch", "Avg. Loss");
      await addImage(svg, CHART_W, CHART_H);
    } else {
      addParagraph(
        "D-MPNN model weights are ready, but no training loss history was recorded in this session.",
      );
    }
  }

  // ── Screening results ─────────────────────────────────────────────────────
  addSectionTitle("Screening Results");
  if (!hasScreening) {
    addParagraph("No screening has been run in this session.", 10, 130);
  } else {
    const isClassification = target.machine_learning_inference_type === "classification";
    addParagraph(
      `${ml.screenData.length} molecules screened${isClassification ? ` at threshold ${ml.screenThreshold}` : ""}.`,
    );

    if (isClassification) {
      const withPreds = ml.sortedScreenData.filter(
        (r) => r.predictions !== undefined && r.predictions !== null,
      );
      const active = withPreds.filter((r) => {
        const pred = r.predictions;
        const score = Array.isArray(pred) ? pred[0] : pred;
        return (score as number) >= ml.screenThreshold;
      }).length;
      const inactive = withPreds.length - active;
      const svg = buildPieSvg(
        [
          { key: `Active (>= ${ml.screenThreshold})`, value: active },
          { key: `Inactive (< ${ml.screenThreshold})`, value: inactive },
        ],
        320,
        260,
      );
      await addImage(svg, 320, 260, 320);
    } else {
      const numericPreds = ml.preds.filter(
        (p) => typeof p === "number" && !isNaN(p),
      );
      if (numericPreds.length > 0) {
        const svg = buildHistogramSvg(numericPreds, CHART_W, CHART_H, "Predicted value", "Count");
        await addImage(svg, CHART_W, CHART_H);
      }
    }

    addParagraph("Top 10 predicted hits:", 10, 60);
    const top10 = ml.sortedScreenData.slice(0, 10).map((r) => {
      const pred = r.predictions;
      const score = Array.isArray(pred) ? pred[0] : pred;
      return [
        r.canonical_smiles ?? "—",
        r.id ?? r.name ?? "—",
        typeof score === "number" ? score.toFixed(4) : "—",
      ];
    });
    ensureSpace(40);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["SMILES", "ID", "Prediction"]],
      body: top10,
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: CONTENT_W * 0.55 } },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  const safeName = (target.target_name || "report").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`qitb_report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Molecule thumbnail grid (uses RDKit directly — no React mount needed) ──
async function addMoleculeGrid(
  doc: jsPDF,
  sample: Record<string, any>[],
  activityCol: string | undefined,
  marginLeft: number,
  contentWidth: number,
  ensureSpace: (needed: number) => void,
  getY: () => number,
  setY: (v: number) => void,
) {
  const rdkit = await initRDKit();
  const cols = 3;
  const cellW = contentWidth / cols;
  const imgSize = 150;
  const cellH = imgSize + 22;

  let rowTop = getY();
  for (let i = 0; i < sample.length; i++) {
    const col = i % cols;
    if (col === 0) {
      ensureSpace(cellH);
      rowTop = getY();
    }

    let svgStr: string | null = null;
    try {
      const mol = rdkit.get_mol(sample[i].canonical_smiles);
      if (mol) {
        svgStr = mol.get_svg(imgSize, imgSize);
        mol.delete();
      }
    } catch {
      svgStr = null;
    }

    if (svgStr) {
      const dataUrl = await svgStringToPngDataUrl(svgStr, imgSize, imgSize);
      const x = marginLeft + col * cellW + (cellW - imgSize) / 2;
      doc.addImage(dataUrl, "PNG", x, rowTop, imgSize, imgSize);
      const label = activityCol
        ? `${activityCol}: ${Number(sample[i][activityCol]).toFixed(2)}`
        : String(sample[i].id ?? sample[i].name ?? "");
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(label, marginLeft + col * cellW + cellW / 2, rowTop + imgSize + 12, {
        align: "center",
      });
      doc.setTextColor(0);
    }

    if (col === cols - 1 || i === sample.length - 1) {
      setY(rowTop + cellH);
    }
  }
}
