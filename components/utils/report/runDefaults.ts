// Triggers the same worker calls each pipeline page sends, using the same
// default parameters as that page's "Express"/default option, so missing
// report sections can be backfilled without visiting every page by hand.
// The actual context updates (target/ligand/ML state) are still applied by
// the existing global listeners in app/tools/layout.tsx — these functions
// only fire the request and wait for the matching response.
import Papa from "papaparse";
import type { targetType } from "../../../context/TargetContext";
import { readFpSettingsAsFormStuff } from "../get_fp_settings";

type WorkerLike = {
  postMessage: (msg: any) => void;
  addEventListener: (type: "message", listener: (e: MessageEvent) => void) => void;
  removeEventListener: (type: "message", listener: (e: MessageEvent) => void) => void;
};

export function waitForMessage(
  worker: WorkerLike,
  predicate: (data: any) => boolean,
  timeoutMs = 120000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.removeEventListener("message", handler);
      reject(new Error("Timed out waiting for worker response"));
    }, timeoutMs);

    function handler(event: MessageEvent) {
      if (predicate(event.data)) {
        clearTimeout(timer);
        worker.removeEventListener("message", handler);
        resolve(event.data);
      }
    }

    worker.addEventListener("message", handler);
  });
}

function medianThreshold(values: number[]): number {
  const sorted = values.filter((v) => v != null && !isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function runPCADefault(pyodide: WorkerLike, ligand: Record<string, any>[]) {
  const id = `report_pca_${Date.now()}`;
  pyodide.postMessage({
    id,
    opts: 1,
    func: "dim_red",
    fp: ligand.map((obj) => obj.fingerprint),
    params: { n_components: 2, pca_pre_components: 30, random_state: 42 },
  });
  await waitForMessage(pyodide, (m) => m.id === id && m.func === "dim_red");
}

export async function runTSNEDefault(pyodide: WorkerLike, ligand: Record<string, any>[]) {
  const id = `report_tsne_${Date.now()}`;
  pyodide.postMessage({
    id,
    opts: 2, // PCA-corrected t-SNE — same default as the t-SNE page's main button
    func: "dim_red",
    fp: ligand.map((obj) => obj.fingerprint),
    params: {
      n_components: 2,
      pca_pre_components: 30,
      perplexity: 30,
      n_iter: 1000,
      n_jobs: 4,
      random_state: 42,
    },
  });
  await waitForMessage(pyodide, (m) => m.id === id && m.func === "dim_red");
}

export async function runClassicalMLDefault(
  pyodide: WorkerLike,
  target: targetType,
  ligand: Record<string, any>[],
) {
  const activityCol = target.activity_columns?.[0];
  if (!activityCol) throw new Error("No activity column set");

  let y = ligand.map((obj) => Number(obj[activityCol]));
  const isClassification = target.machine_learning_inference_type === "classification";
  let threshold: number | undefined;
  if (isClassification) {
    threshold = medianThreshold(y);
    y = y.map((v) => (v >= threshold! ? 1 : 0));
  }

  const id = `report_ml_${Date.now()}`;
  pyodide.postMessage({
    id,
    func: "ml",
    fp: ligand.map((mol) => mol.fingerprint),
    opts: isClassification ? 2 : 1, // Random Forest, same default as RF.tsx's initial form values
    params: {
      n_estimators: 120,
      criterion: isClassification ? "gini" : "squared_error",
      max_features: "sqrt",
      n_jobs: 2,
      activity_columns: y,
      task_type: target.machine_learning_inference_type,
      threshold,
      smiles: ligand.map((mol) => mol.canonical_smiles),
      ids: ligand.map((mol) => mol.id ?? mol.canonical_smiles),
    },
  });
  await waitForMessage(pyodide, (m) => m.id === id && m.func === "ml");
}

export async function runDmpnnDefault(
  rdkit: WorkerLike,
  target: targetType,
  ligand: Record<string, any>[],
) {
  const activityCol = target.activity_columns?.[0];
  if (!activityCol) throw new Error("No activity column set");

  let y = ligand.map((obj) => Number(obj[activityCol]));
  const isClassification = target.machine_learning_inference_type === "classification";
  if (isClassification) {
    const threshold = medianThreshold(y);
    y = y.map((v) => (v >= threshold ? 1 : 0));
  }

  rdkit.postMessage({
    function: "DMPNN_train",
    smiles: ligand.map((mol) => mol.canonical_smiles),
    labels: y,
    epochs: 20, // same default as the D-MPNN page's epochs field
    ids: ligand.map((mol) => mol.id ?? mol.name ?? ""),
    config: {
      atom_dim: 72,
      bond_dim: 14,
      hidden_dim: 300,
      depth: 3,
      dropout: 0.0,
      ffn_hidden_dim: 300,
      ffn_num_layers: 2,
      num_tasks: 1,
      task_type: target.machine_learning_inference_type,
      batching: true,
      batch_size: 16,
    },
  });

  // Training emits one message per epoch — wait for the final one.
  await waitForMessage(
    rdkit,
    (m) =>
      m.function === "dmpnn_train_epoch" &&
      m.fold === null &&
      m.epoch === m.total_epochs,
    10 * 60 * 1000,
  );
}

export async function runScreeningDefault(
  rdkit: WorkerLike,
  getLatestMl: () => { classicalModelReady: boolean; dmpnnWeightsReady: boolean; screenData: any[] },
) {
  const before = getLatestMl().screenData;

  const res = await fetch("/cleaned_compounds.csv");
  if (!res.ok) throw new Error("Failed to fetch the default Broad Hub screening dataset");
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const normalised = (parsed.data as any[])
    .map((row) => ({
      broad_id: row.broad_id || "",
      name: row.name || "",
      canonical_smiles: row.clean_smiles || row.canonical_smiles || "",
      activity: "Broad Hub",
    }))
    .filter((row) => row.canonical_smiles);

  if (getLatestMl().dmpnnWeightsReady) {
    rdkit.postMessage({
      function: "dmpnn_infer_batch",
      smiles: normalised.map((m) => m.canonical_smiles),
      mol_data: normalised,
    });
  } else if (getLatestMl().classicalModelReady) {
    rdkit.postMessage({
      function: "only_fingerprint",
      id: `ml_screen_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      mol_data: normalised,
      formStuff: readFpSettingsAsFormStuff(),
    });
  } else {
    throw new Error("No trained model is available to screen with");
  }

  // Both paths eventually land in MLResultsContext.screenData via the
  // existing global handler — poll for that rather than re-deriving the
  // (different) response shape each path produces.
  const start = Date.now();
  while (Date.now() - start < 90000) {
    await new Promise((r) => setTimeout(r, 400));
    const latest = getLatestMl().screenData;
    if (latest.length > 0 && latest !== before) return;
  }
  throw new Error("Timed out waiting for screening to complete");
}
