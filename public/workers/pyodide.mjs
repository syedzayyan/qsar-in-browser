import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.mjs";

// start loading pyodide immediately
let pyodideReadyPromise = loadPyodide();

// helper to ensure packages are available
async function ensurePackages(pyodide) {
  // scikit-learn and numpy are required
  await pyodide.loadPackage(["scikit-learn", "numpy"]);
}

self.onmessage = async (event) => {
  // Expect event.data to be an object like:
  // {
  //   id: <any id to echo back>,
  //   func: 'dim_red',      // function name
  //   opts: 1 | 2 | 3,            // 1 = PCA (normal), 2 = PCA->tSNE, 3 = tSNE (direct)
  //   fp: <Array of feature vectors (Array of Arrays)>,
  //   params: {                  // optional parameters:
  //     n_components: 2,          // for normal PCA output dims
  //     pca_pre_components: 30,   // PCA pre-reduction before t-SNE
  //     perplexity: 30,
  //     n_iter: 1000,
  //     n_jobs: 1,
  //     random_state: 42
  //   }
  // }
  const { opts = 1, func = 'dim_red', fp, params = {} } = event.data;
  const pyodide = await pyodideReadyPromise;
  await ensurePackages(pyodide);
  switch (func) {
    case 'dim_red':
      try {


        // inject the JS data into the Python global namespace
        // This avoids string interpolation and keeps values structured.
        pyodide.globals.set("js_fp", fp);
        pyodide.globals.set("js_opts", opts);
        pyodide.globals.set("js_params", params);

        // Run the Python code
        await pyodide.runPythonAsync(await (await fetch("/python/dim_red.py")).text());

        // Extract results from the Python globals
        const py_result = pyodide.globals.get("pca_result"); // PyProxy
        const py_explained = pyodide.globals.get("explained_variance"); // PyProxy or None

        // Post results back to the main thread
        self.postMessage({
          ok: true,
          func,
          opts,
          result: py_result.toJs(),
          explained_variance: py_explained
        });
      } catch (error) {
        // send a structured error back
        self.postMessage({ ok: false, error: String(error && error.message ? error.message : error) });
      }
      break;
    case "ml":
      try {
        globalThis.neg_log_activity_column = params.activity_columns;
        globalThis.fp = fp;
        globalThis.model_parameters = params;
        globalThis.neg_log_activity_column = params.activity_columns;
        globalThis.opts = params.model;

        await pyodide.runPythonAsync(await (await fetch("/python/pyodide_ml.py")).text());

        const results = globalThis.metrics.toJs();
        const results_mae = results.map((arr) => arr[0]);
        const results_r2 = results.map((arr) => arr[1]);

        let flatData = [];
        globalThis.perFoldPreds.toJs().flatMap(subArray => {
          let anArray = []
          subArray[0].map((_, index) => {
            anArray.push({ x: subArray[0][index], y: subArray[1][index] });
          });
          flatData.push(anArray);
        });

        self.postMessage({
          "results": [results_mae, results_r2, flatData], func, opts, ok: true
        });
      } catch (error) {
        // send a structured error back
        self.postMessage({ ok: false, error: String(error && error.message ? error.message : error) });
      }
      break;
    case "ml-screen":
      globalThis.one_off_mol_fp = fp;
      await pyodide.runPythonAsync(await (await fetch("/python/pyodide_ml_screen.py")).text());
      self.postMessage({success : "ok", results : globalThis.one_off_y.toJs()})
      break;
    default:
      self.postMessage({ ok: false, error: `Unknown function: ${func}` });
      return;
  }
};