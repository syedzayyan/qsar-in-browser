import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.mjs";

// ============================
// IndexedDB Utils (Fixed)
// ============================
// TOP OF pyodide_worker.js - replace your DB utils
const DB_NAME = 'MolGA_DB';
const STORE_NAME = 'models';
let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = self.indexedDB.open(DB_NAME, 3);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log('DB opened v3');
      resolve(request.result);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('Upgrading DB to v3');
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'name' });
    };
  });
  return dbPromise;
}

async function saveModel(modelName, modelBytes) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ name: modelName, data: modelBytes, ts: Date.now() });
    req.onsuccess = () => resolve(modelName);
    req.onerror = () => reject(req.error);
  });
}

async function loadModel(modelName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(modelName);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => reject(req.error);
  });
}


// ============================
// Pyodide setup
// ============================
let pyodideReadyPromise = loadPyodide();

async function ensurePackages(pyodide) {
  await pyodide.loadPackage(["scikit-learn", "numpy", "xgboost"]);
}

self.onmessage = async (event) => {
  const { id, func = 'dim_red', opts = 1, fp, params = {} } = event.data;
  const pyodide = await pyodideReadyPromise;
  await ensurePackages(pyodide);

  try {
    switch (func) {
      case 'dim_red':
        pyodide.globals.set("js_fp", fp);
        pyodide.globals.set("js_opts", opts);
        pyodide.globals.set("js_params", params);
        await pyodide.runPythonAsync(await (await fetch("/python/dim_red.py")).text());

        const py_result = pyodide.globals.get("pca_result");
        const py_explained = pyodide.globals.get("explained_variance");

        self.postMessage({
          id,
          ok: true,
          func,
          opts,
          result: py_result?.toJs() || null,
          explained_variance: py_explained
        });
        break;

      case "ml":
        globalThis.neg_log_activity_column = params.activity_columns;
        globalThis.fp = fp;
        globalThis.model_parameters = params;
        globalThis.opts = params.model;

        await pyodide.runPythonAsync(await (await fetch("/python/pyodide_ml.py")).text());

        const results = globalThis.metrics?.toJs() || [];
        let metric1 = [], metric2 = [];

        if (globalThis.opts === 1 || globalThis.opts === 3) {
          metric1 = results.map(arr => arr[0]);
          metric2 = results.map(arr => arr[1]);
        } else if (globalThis.opts === 2 || globalThis.opts === 4) {
          metric1 = results.map(arr => arr[0]);
          metric2 = results.map(arr => arr[1]);
        }

        let flatData = [];
        globalThis.perFoldPreds?.toJs()?.flatMap?.(subArray => {
          let anArray = [];
          subArray[0]?.map?.((_, index) => {
            anArray.push({
              x: subArray[0][index],
              y: subArray[1][index]
            });
          });
          flatData.push(anArray);
        });

        // After pyodide_ml.py runs and model.pkl exists:
        const modelBytesPy = await pyodide.runPythonAsync(`
with open("model.pkl", "rb") as f:
    b = f.read()
b
`);
        const modelUint8 = new Uint8Array(modelBytesPy.toJs());
        await saveModel('model', modelUint8);
        const modelName = `model_${params.model || globalThis.opts}_${Date.now()}`;

        self.postMessage({
          results: [metric1, metric2, flatData],
          modelId: modelName,  // Tell UI which model was saved
          id,
          func,
          opts,
          ok: true
        });
        break;

      case "ml-screen":
        globalThis.one_off_mol_fp = fp;
        await pyodide.runPythonAsync(await (await fetch("/python/pyodide_ml_screen.py")).text());
        self.postMessage({
          success: "ok",
          id,
          results: globalThis.one_off_y?.toJs() || []
        });
        break;

      case 'score_batch':
        try {
          const modelBytes = await loadModel('model');
          if (!modelBytes) throw new Error('No model in IndexedDB, train "ml" first');

          pyodide.FS.writeFile('/model.pkl', modelBytes);
          globalThis.one_off_mol_fp = fp;

          await pyodide.runPythonAsync(`
import js
import joblib, numpy as np
model = joblib.load('/model.pkl')
X = np.array(${JSON.stringify(fp)})
js.one_off_y = model.predict(X).tolist()
    `);

          self.postMessage({ id, ok: true, result: globalThis.one_off_y.toJs() });
        } catch (e) {
          self.postMessage({ id, ok: false, error: String(e) });
        }
        break;


      case 'test_db':
        const testBytes = new Uint8Array([1, 2, 3, 4, 5]);
        await saveModel('test_model', testBytes);
        const loaded = await loadModel('test_model');
        self.postMessage({
          id,
          ok: true,
          result: loaded ? `SUCCESS: ${loaded.length} bytes` : 'NULL'
        });
        break;

      default:
        throw new Error(`Unknown function: ${func}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: `pyodide_worker ${func}: ${String(error && error.message ? error.message : error)}`
    });
  }
};
