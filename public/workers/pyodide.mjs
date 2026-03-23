import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.mjs";

// ============================
// IndexedDB
// ============================
const DB_NAME = 'MolGA_DB';
const STORE_NAME = 'models';
let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = self.indexedDB.open(DB_NAME, 3);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('DB opened v3');
        resolve(request.result);
      };
      request.onupgradeneeded = (event) => {
        try {
          const db = event.target.result;
          console.log('Upgrading DB to v3');
          if (db.objectStoreNames.contains(STORE_NAME)) {
            db.deleteObjectStore(STORE_NAME);
          }
          db.createObjectStore(STORE_NAME, { keyPath: 'name' });
        } catch (e) {
          reject(e);
        }
      };
    } catch (e) {
      reject(e);
    }
  });
  return dbPromise;
}

async function saveModel(modelName, modelBytes) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.onerror = () => reject(tx.error);
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ name: modelName, data: modelBytes, ts: Date.now() });
        req.onsuccess = () => resolve(modelName);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  } catch (e) {
    console.error('saveModel error:', e);
    throw e;
  }
}

async function loadModel(modelName) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        tx.onerror = () => reject(tx.error);
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(modelName);
        req.onsuccess = () => resolve(req.result?.data || null);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  } catch (e) {
    console.error('loadModel error:', e);
    throw e;
  }
}

// ============================
// Pyodide — load once at boot
// ============================
const pyodideReadyPromise = loadPyodide().then(async (pyodide) => {
  try {
    await pyodide.loadPackage(["scikit-learn", "numpy", "xgboost"]);
    console.log('Pyodide packages loaded');
  } catch (e) {
    console.error('Failed to load Pyodide packages:', e);
    throw e;
  }
  return pyodide;
});

// ============================
// Python file fetcher (cached)
// ============================
const pyFileCache = new Map();
async function fetchPy(path) {
  try {
    if (pyFileCache.has(path)) return pyFileCache.get(path);
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    const text = await res.text();
    pyFileCache.set(path, text);
    return text;
  } catch (e) {
    console.error('fetchPy error:', e);
    throw e;
  }
}

// ============================
// Helpers
// ============================
function postOk(id, payload) {
  self.postMessage({ id, ok: true, ...payload });
}

function postErr(id, func, error) {
  const msg = error?.message || String(error) || 'Unknown error';
  console.error(`[pyodide_worker:${func}]`, error);
  self.postMessage({ id, ok: false, error: `[${func}] ${msg}` });
}

// ============================
// Memory cleanup helper
// ============================
async function runPythonCleanup(pyodide, extraVars = []) {
  const varList = ['X', 'y', 'model', 'proba', 'metrics', 'per_fold_preds', 'model_b64', ...extraVars];
  const varListStr = JSON.stringify(varList);
  await pyodide.runPythonAsync(`
import gc, json
_to_delete = json.loads('${varListStr}')
for _var in _to_delete:
    try:
        del globals()[_var]
    except KeyError:
        pass
gc.collect()
  `);
}

function clearGlobalThis(...keys) {
  for (const key of keys) {
    try { globalThis[key] = null; } catch (_) { }
  }
}

function unlinkModelIfExists(pyodide) {
  try {
    if (pyodide.FS.analyzePath('./model.pkl').exists) {
      pyodide.FS.unlink('./model.pkl');
    }
  } catch (_) { }
}

// ============================
// Message handler
// ============================
self.onmessage = async (event) => {
  const { id, func = 'dim_red', opts = 1, fp, params = {} } = event.data;

  let pyodide;
  try {
    pyodide = await pyodideReadyPromise;
  } catch (e) {
    postErr(id, 'init', new Error(`Pyodide failed to initialise: ${e?.message || e}`));
    return;
  }

  try {
    switch (func) {

      // ── Dimensionality reduction ──────────────────────────────────────────
      case 'dim_red': {
        try {
          pyodide.globals.set("js_fp", fp);
          pyodide.globals.set("js_opts", opts);
          pyodide.globals.set("js_params", params);

          await pyodide.runPythonAsync(await fetchPy("/python/dim_red.py"));

          const py_result = pyodide.globals.get("pca_result");
          const py_explained = pyodide.globals.get("explained_variance");

          const result = py_result?.toJs() ?? null;
          const explained_variance = py_explained ?? null;

          // Cleanup
          pyodide.globals.delete("js_fp");
          pyodide.globals.delete("js_opts");
          pyodide.globals.delete("js_params");
          pyodide.globals.delete("pca_result");
          pyodide.globals.delete("explained_variance");
          await runPythonCleanup(pyodide, ['pca_result', 'explained_variance', 'reducer']);
          clearGlobalThis('js_fp', 'js_opts', 'js_params');

          postOk(id, { func, opts, result, explained_variance });
        } catch (e) {
          throw e;
        }
        break;
      }

      // ── ML training ───────────────────────────────────────────────────────
      case 'ml': {
        try {
          globalThis.neg_log_activity_column = params.activity_columns;
          globalThis.fp = fp;
          globalThis.model_parameters = params;
          globalThis.opts = params.model;
          globalThis.smiles_list = params.smiles;   // ← add
          globalThis.ids_list = params.ids;          // ← add

          await pyodide.runPythonAsync(await fetchPy("/python/pyodide_ml.py"));

          const results = globalThis.metrics?.toJs() ?? [];
          const metric1 = results.map(arr => arr[0]);
          const metric2 = results.map(arr => arr[1]);

          const rawFolds = globalThis.perFoldPreds?.toJs({ depth: 4 });
          console.log('rawFolds', rawFolds); // ← check this too

          const flatData = [];
          rawFolds?.forEach((subArray) => {
            const [testY, pred, smiles, ids] = subArray;
            const anArray = [];
            Array.from(testY ?? []).forEach((_, index) => {
              anArray.push({
                x: Array.from(testY)[index],
                y: Array.from(pred)[index],
                smiles: Array.from(smiles ?? [])[index] ?? '',
                id: Array.from(ids ?? [])[index] ?? '',
              });
            });
            flatData.push(anArray);
          });

          const modelB64 = pyodide.globals.get("model_b64");
          if (!modelB64) throw new Error('model_b64 not set by pyodide_ml.py — model was not saved');

          const modelBytes = Uint8Array.from(atob(modelB64), c => c.charCodeAt(0));
          await saveModel('model', modelBytes);
          const modelName = `model_${params.model ?? globalThis.opts}_${Date.now()}`;

          // Cleanup before posting — we've already extracted everything we need
          clearGlobalThis('neg_log_activity_column', 'fp', 'model_parameters', 'opts',
            'metrics', 'perFoldPreds', 'smiles_list', 'ids_list');
          await runPythonCleanup(pyodide, ['model_b64', 'clf', 'pipeline', 'scaler', 'fold_preds']);
          // Don't unlink model.pkl here — screening may need it immediately after training

          postOk(id, {
            func,
            opts,
            results: [metric1, metric2, flatData],
            modelId: modelName,
          });
        } catch (e) {
          throw e;
        }
        break;
      }

      // ── ML screening / scoring ────────────────────────────────────────────
      case 'ml_screen':
      case 'score_batch': {
        try {
          // Always reload model from IndexedDB fresh — avoids stale FS state
          unlinkModelIfExists(pyodide);
          const modelBytes = await loadModel('model');
          if (!modelBytes) throw new Error('No trained model found in IndexedDB — train a model first');
          pyodide.FS.writeFile('./model.pkl', modelBytes);

          globalThis.one_off_mol_fp = fp;
          globalThis.opts = params.model;

          await pyodide.runPythonAsync(await fetchPy("/python/pyodide_ml_screen.py"));

          const prediction = globalThis.one_off_y;
          if (prediction == null) throw new Error('pyodide_ml_screen.py did not set one_off_y');

          // Extract result BEFORE cleanup
          const resultJs = prediction.toJs();

          // Cleanup — this is the main source of memory bloat on reruns
          clearGlobalThis('one_off_mol_fp', 'one_off_y', 'opts');
          await runPythonCleanup(pyodide, ['X', 'model', 'proba', 'preds']);
          unlinkModelIfExists(pyodide); // free the pkl from virtual FS

          postOk(id, { func, result: resultJs, _aligned: event.data._aligned });
        } catch (e) {
          // Cleanup even on failure
          clearGlobalThis('one_off_mol_fp', 'one_off_y', 'opts');
          unlinkModelIfExists(pyodide);
          throw e;
        }
        break;
      }

      // ── Manual cleanup (call after screening from layout) ─────────────────
      case 'cleanup': {
        clearGlobalThis('one_off_mol_fp', 'one_off_y', 'opts', 'fp',
          'neg_log_activity_column', 'model_parameters', 'metrics', 'perFoldPreds');
        unlinkModelIfExists(pyodide);
        await runPythonCleanup(pyodide, [
          'X', 'y', 'model', 'proba', 'preds', 'model_b64',
          'clf', 'pipeline', 'scaler', 'fold_preds', 'reducer',
        ]);
        postOk(id, { func: 'cleanup' });
        break;
      }

      // ── DB smoke test ─────────────────────────────────────────────────────
      case 'test_db': {
        try {
          const testBytes = new Uint8Array([1, 2, 3, 4, 5]);
          await saveModel('test_model', testBytes);
          const loaded = await loadModel('test_model');
          postOk(id, { func, result: loaded ? `SUCCESS: ${loaded.length} bytes` : 'NULL' });
        } catch (e) {
          throw e;
        }
        break;
      }

      default:
        throw new Error(`Unknown func: "${func}"`);
    }
  } catch (error) {
    postErr(id, func, error);
  }
};
