// unified_rdkit_worker.js
console.log("Unified RDKit Worker Activated");

const rdkitWasmUrl = new URL("/rdkit/RDKit_minimal.wasm", self.location.origin)
  .href;
let RDKitInstancePromise = null;

// Pyodide worker for ML scoring (GA only)
let pyodideWorker = null;
let pyodideJobId = 0;
const pyodideCallbacks = new Map();

// GA cancellation flag
let gaCancelled = false;

self.onmessage = async (event) => {
  const { function: funcName, id, ...params } = event.data;

  try {
    switch (funcName) {
      case 'fingerprint':
        await processFingerprintData(params, id);
        break;
      case 'only_fingerprint':
        await makeFingerprints(params, id);
        break;
      case 'mma':
        scaffoldArrayGetter(params.mol_data, params.activity_columns, id);
        break;
      case 'tanimoto':
        await tanimoto_gen(params, id);
        break;
      case 'substructure_search':
        await substructure_search(params, id);
        break;
      case 'scaffold_network':
        await scaffold_network(params, id);
        break;
      case 'physchem_descriptors':
        await calcPhysChemDescriptors(params, id);
        break;
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }
  } catch (error) {
    notify({ id, error: error.message });
  }
};

// Convenience: resolve an fpType string to its registry entry; throw on unknown.
function getFpDef(fpType) {
  const def = FP_REGISTRY[fpType];
  if (!def) {
    throw new Error(
      `Unknown fingerprint type "${fpType}". Valid types: ${Object.keys(FP_REGISTRY).join(", ")}`,
    );
  }
  return def;
}

// Build the JSON details string for a fingerprint given user-supplied settings.
// Falls back to registry defaults for every key not present in settings.
function buildFpDetails(def, settings = {}) {
  if (!def.paramKeys.length) return null; // MACCS – no argument
  const params = {};
  for (const key of def.paramKeys) {
    params[key] = key in settings ? settings[key] : def.defaultParams[key];
  }
  return JSON.stringify(params);
}

// Call mol.get_*_fp() with the right arguments for this FP type.
function computeFpBitString(mol, def, settings = {}) {
  const details = buildFpDetails(def, settings);
  return details === null ? mol[def.method]() : mol[def.method](details);
}

// ============================
// Notify helpers
// ============================
function notify(message) {
  self.postMessage(message);
}

function notifyError(id, funcName, error) {
  const msg = error?.message || String(error) || "Unknown error";
  console.error(`[${funcName}] Error:`, error);
  notify({ id, ok: false, error: `[${funcName}] ${msg}` });
}

// ============================
// Utility functions
// ============================
function bitStringToBitVector(bitString) {
  return bitString.split("").map((bit) => parseFloat(bit));
}

function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === "string" || Array.isArray(value))
    return value.length === 0;
  if (value instanceof Map || value instanceof Set) return value.size === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function safeDelete(...objs) {
  for (const obj of objs) {
    try {
      obj?.delete();
    } catch (_) {
      /* swallow */
    }
  }
}

// ============================
// RDKit loader
// ============================
async function loadRDKit() {
  if (!RDKitInstancePromise) {
    RDKitInstancePromise = new Promise((resolve, reject) => {
      try {
        self.importScripts("/rdkit/RDKit_minimal.js");
        initRDKitModule({ locateFile: () => rdkitWasmUrl })
          .then((mod) => {
            notify({ message: mod.version() + " Loaded" });
            resolve(mod);
          })
          .catch((err) => {
            RDKitInstancePromise = null;
            reject(
              new Error(`RDKit WASM failed to load: ${err?.message || err}`),
            );
          });
      } catch (err) {
        RDKitInstancePromise = null;
        reject(new Error(`importScripts failed: ${err?.message || err}`));
      }
    });
  }
  return RDKitInstancePromise;
}

// ============================
// Pyodide bridge
// ============================
function initPyodideWorker() {
  if (!pyodideWorker) {
    pyodideWorker = new Worker("/workers/pyodide.mjs", { type: "module" });
    pyodideWorker.onmessage = (event) => {
      const { id, ok, result, error } = event.data;
      const cb = pyodideCallbacks.get(id);
      pyodideCallbacks.delete(id);
      if (!cb) return;
      if (ok) cb.resolve(result);
      else cb.reject(new Error(error || "Pyodide worker error"));
    };
    pyodideWorker.onerror = (err) => {
      console.error("Pyodide worker uncaught error:", err);
    };
  }
  return pyodideWorker;
}

function callPyodide(msg, timeoutMs = 30000) {
  initPyodideWorker();
  return new Promise((resolve, reject) => {
    const id = ++pyodideJobId;
    const timer = setTimeout(() => {
      pyodideCallbacks.delete(id);
      reject(new Error(`Pyodide timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    pyodideCallbacks.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    pyodideWorker.postMessage({ id, ...msg });
  });
}

// ============================
// GA utilities
// ============================
function weightedChoiceIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

function weightedChoice(items, weights) {
  return items[weightedChoiceIndex(weights)];
}

const MUTATION_TYPE_WEIGHTS = [0.15, 0.14, 0.14, 0.14, 0.14, 0.14, 0.15];

function deleteAtomTemplate() {
  const choices = [
    "[*:1]~[D1:2]>>[*:1]",
    "[*:1]~[D2:2]~[*:3]>>[*:1]-[*:3]",
    "[*:1]~[D3:2](~[*;!H0:3])~[*:4]>>[*:1]-[*:3]-[*:4]",
    "[*:1]~[D4:2](~[*;!H0:3])(~[*;!H0:4])~[*:5]>>[*:1]-[*:3]-[*:4]-[*:5]",
    "[*:1]~[D4:2](~[*;!H0;!H1:3])(~[*:4])~[*:5]>>[*:1]-[*:3](-[*:4])-[*:5]",
  ];
  return weightedChoice(choices, [0.25, 0.25, 0.25, 0.1875, 0.0625]);
}

function appendAtomTemplate() {
  const choices = [
    {
      bo: "single",
      atoms: ["C", "N", "O", "F", "S", "Cl", "Br"],
      weights: Array(7).fill(1 / 7),
    },
    { bo: "double", atoms: ["C", "N", "O"], weights: Array(3).fill(1 / 3) },
    { bo: "triple", atoms: ["C", "N"], weights: [0.5, 0.5] },
  ];
  const choice = choices[weightedChoiceIndex([0.6, 0.35, 0.05])];
  const newAtom = weightedChoice(choice.atoms, choice.weights);
  if (choice.bo === "single") return `[*;!H0:1]>>[*:1]-${newAtom}`;
  if (choice.bo === "double") return `[*;!H0;!H1:1]>>[*:1]=${newAtom}`;
  return `[*;H3:1]>>[*:1]#${newAtom}`;
}

function insertAtomTemplate() {
  const choices = [
    {
      bo: "single",
      atoms: ["C", "N", "O", "S"],
      weights: Array(4).fill(1 / 4),
    },
    { bo: "double", atoms: ["C", "N"], weights: [0.5, 0.5] },
    { bo: "triple", atoms: ["C"], weights: [1.0] },
  ];
  const choice = choices[weightedChoiceIndex([0.6, 0.35, 0.05])];
  const newAtom = weightedChoice(choice.atoms, choice.weights);
  if (choice.bo === "single") return `[*:1]~[*:2]>>[*:1]${newAtom}[*:2]`;
  if (choice.bo === "double") return `[*;!H0:1]~[*:2]>>[*:1]=${newAtom}-[*:2]`;
  return `[*;!R;!H1;!H0:1]~[*:2]>>[*:1]#${newAtom}-[*:2]`;
}

function changeBondOrderTemplate() {
  const choices = [
    "[*:1]!-[*:2]>>[*:1]-[*:2]",
    "[*;!H0:1]-[*;!H0:2]>>[*:1]=[*:2]",
    "[*:1]#[*:2]>>[*:1]=[*:2]",
    "[*;!R;!H1;!H0:1]~[*:2]>>[*:1]#[*:2]",
  ];
  return weightedChoice(choices, [0.45, 0.45, 0.05, 0.05]);
}

function deleteCyclicBondTemplate() {
  return "[*:1]@[*:2]>>([*:1].[*:2])";
}

function addRingTemplate() {
  const choices = [
    "[*;!r;!H0:1]~[*;!r:2]~[*;!r;!H0:3]>>[*:1]1~[*:2]~[*:3]1",
    "[*;!r;!H0:1]~[*!r:2]~[*!r:3]~[*;!r;!H0:4]>>[*:1]1~[*:2]~[*:3]~[*:4]1",
    "[*;!r;!H0:1]~[*!r:2]~[*:3]~[*:4]~[*;!r;!H0:5]>>[*:1]1~[*:2]~[*:3]~[*:4]~[*:5]1",
    "[*;!r;!H0:1]~[*!r:2]~[*:3]~[*:4]~[*!r:5]~[*;!r;!H0:6]>>[*:1]1~[*:2]~[*:3]~[*:4]~[*:5]~[*:6]1",
  ];
  return weightedChoice(choices, [0.05, 0.05, 0.45, 0.45]);
}

function changeAtomTemplate(smiles, RDKitInstance) {
  const choices = ["#6", "#7", "#8", "#9", "#16", "#17", "#35"];
  const p = [0.15, 0.15, 0.14, 0.14, 0.14, 0.14, 0.14];
  const mol = RDKitInstance.get_mol(smiles);
  try {
    let X = weightedChoice(choices, p);
    for (let loopCount = 0; loopCount < 100; loopCount++) {
      const qmol = RDKitInstance.get_qmol(`[${X}]`);
      let matches;
      try {
        matches = mol.get_substruct_match(qmol);
      } finally {
        safeDelete(qmol);
      }
      if (matches && JSON.parse(matches).length > 0) break;
      X = weightedChoice(choices, p);
    }
    let Y = weightedChoice(choices, p);
    while (Y === X) Y = weightedChoice(choices, p);
    return `[${X}:1]>>[${Y}:1]`;
  } finally {
    safeDelete(mol);
  }
}

function generateMutationSmarts(smiles, RDKitInstance) {
  switch (weightedChoiceIndex(MUTATION_TYPE_WEIGHTS)) {
    case 0:
      return insertAtomTemplate();
    case 1:
      return changeBondOrderTemplate();
    case 2:
      return deleteCyclicBondTemplate();
    case 3:
      return addRingTemplate();
    case 4:
      return deleteAtomTemplate();
    case 5:
      return changeAtomTemplate(smiles, RDKitInstance);
    case 6:
      return appendAtomTemplate();
    default:
      return deleteAtomTemplate();
  }
}

// ============================
// Fingerprint helpers
// ============================

/**
 * Generate fingerprints for an array of ligand objects.
 *
 * settings shape (all optional, fall back to registry defaults):
 *   fingerprint          – FP_REGISTRY key, e.g. 'morgan'  (default: 'maccs')
 *   radius / minPath     – path length / radius param
 *   nBits                – fingerprint length
 *   useChirality         – Morgan: include chirality
 *   useBondTypes         – Morgan: use bond types
 *   useFeatures          – Morgan: use feature invariants (FCFP-like)
 *   maxPath              – RDKit FP: max path length
 *   useHs / branchedPaths / useBondOrder – RDKit FP options
 *   minDistance / maxDistance – AtomPair options
 *   includeChirality     – AtomPair / TopologicalTorsion
 *   use2D                – AtomPair
 *   tautomerFingerprints – Pattern FP
 */
async function generateFingerprints(
  ligandData,
  settings,
  RDKitInstance,
  requestId,
) {
  const fpType = settings.fingerprint ?? "maccs";
  const def = getFpDef(fpType);
  const results = [];

  // Build FP-specific settings object once (avoids re-building per molecule).
  // Morgan historically used 'radius'; rdkit_fp used 'minPath' for path length.
  // We normalise here so callers can use either name.
  const fpSettings = buildNormalisedFpSettings(fpType, settings);

  for (let idx = 0; idx < ligandData.length; idx++) {
    const x = ligandData[idx];
    let mol;
    try {
      mol = RDKitInstance.get_mol(x.canonical_smiles);
      const bitString = computeFpBitString(mol, def, fpSettings);
      x.fingerprint = bitStringToBitVector(bitString);
      results.push(x);
      notify({
        id: requestId,
        message: `Progress: ${Math.round((idx / ligandData.length) * 100)}%`,
      });
    } catch (e) {
      console.warn(
        `Skipping molecule ${x.canonical_smiles}: ${e?.message || e}`,
      );
    } finally {
      safeDelete(mol);
    }
  }
  return results;
}

/**
 * Normalise user-supplied settings into the canonical parameter names each FP
 * definition expects, filling in registry defaults for anything missing.
 *
 * Legacy callers used 'radius' for Morgan and 'minPath'/'nBits' for rdkit_fp.
 * This function maps those transparently so existing call sites continue to work.
 */
function buildNormalisedFpSettings(fpType, settings = {}) {
  const def = getFpDef(fpType);
  const out = { ...def.defaultParams };

  // Overlay whatever the caller provided
  for (const key of def.paramKeys) {
    if (key in settings) out[key] = settings[key];
  }

  // Legacy aliases
  if (fpType === "morgan" && "radius" in settings) out.radius = settings.radius;
  if (fpType === "rdkit_fp") {
    if ("minPath" in settings) out.minPath = settings.minPath;
    // Older code passed 'radius' as the path parameter for rdkit_fp
    if ("radius" in settings && !("minPath" in settings))
      out.minPath = settings.radius;
  }

  return out;
}

function molListFromSmiArray(smiArray, rdkit) {
  const molList = new rdkit.MolList();
  for (const smiName of smiArray) {
    const [smi] = smiName.split(" ");
    let mol;
    try {
      mol = rdkit.get_mol(smi);
      molList.append(mol);
    } catch (e) {
      console.warn(
        `molListFromSmiArray: skipping invalid SMILES "${smi}": ${e?.message || e}`,
      );
    } finally {
      safeDelete(mol);
    }
  }
  return molList;
}

// ============================
// Core processing functions
// ============================
// ── Step 1: Validate SMILES ────────────────────────────────────────────────────
function filterValidSmiles(mol_data, RDKit) {
  return mol_data.filter((lig) => {
    if (!lig.canonical_smiles || typeof lig.canonical_smiles !== "string")
      return false;
    const mol = RDKit.get_mol(lig.canonical_smiles);
    if (!mol) return false;
    mol.delete();
    return true;
  });
}

// ── Step 2: Strip salts / multicomponent — keep largest fragment ──────────────
function stripSalts(mol_data, RDKit) {
  return mol_data.map((lig) => {
    if (!lig.canonical_smiles.includes(".")) return lig;
    const fragments = lig.canonical_smiles.split(".");
    let heaviestSmi = fragments[0];
    let heaviestCount = 0;
    for (const smi of fragments) {
      const m = RDKit.get_mol(smi);
      if (!m) continue;
      const desc = JSON.parse(m.get_descriptors());
      m.delete();
      const count = desc.NumHeavyAtoms ?? 0;
      if (count > heaviestCount) {
        heaviestCount = count;
        heaviestSmi = smi;
      }
    }
    const frag = RDKit.get_mol(heaviestSmi);
    if (!frag) return lig;
    const cleaned = frag.get_smiles();
    frag.delete();
    return { ...lig, canonical_smiles: cleaned };
  });
}

// ── Step 3: Resolve stereochemistry ───────────────────────────────────────────
function resolveStereochemistry(mol_data, activity_columns, RDKit) {
  // get_smiles accepts details_json — pass doIsomericSmiles: false to strip stereo
  const noStereoDetails = JSON.stringify({ doIsomericSmiles: false });

  const withStripped = mol_data.map((lig) => {
    const mol = RDKit.get_mol(lig.canonical_smiles);
    if (!mol) return { ...lig, _stripped: lig.canonical_smiles };
    const stripped = mol.get_smiles(noStereoDetails);
    mol.delete();
    return { ...lig, _stripped: stripped };
  });

  const groups = new Map();
  for (const lig of withStripped) {
    if (!groups.has(lig._stripped)) groups.set(lig._stripped, []);
    groups.get(lig._stripped).push(lig);
  }

  const result = [];
  for (const [stripped, group] of groups) {
    const { _stripped, ...first } = group[0];
    if (group.length === 1) {
      result.push(first);
      continue;
    }
    const allMatch = group.every((lig) =>
      activity_columns.every((col) => lig[col] === group[0][col]),
    );
    if (allMatch) {
      result.push({ ...first, canonical_smiles: stripped });
    }
    // Conflicting stereo isomers with different labels → dropped
  }
  return result;
}

// ── Step 4: Deduplication (id + SMILES exact match) ───────────────────────────
function deduplicate(mol_data) {
  return mol_data.filter(
    (lig, idx, self) =>
      idx ===
      self.findIndex(
        (t) => t.id === lig.id && t.canonical_smiles === lig.canonical_smiles,
      ),
  );
}

// ── Step 5: Log10 transform ───────────────────────────────────────────────────
function applyLog10Transform(mol_data, activity_columns) {
  const needsTransform = activity_columns.map((col) => !col.includes("p"));
  const new_columns = activity_columns.map((col, i) =>
    needsTransform[i] ? "p" + col : col,
  );
  const filtered = mol_data.filter((lig) =>
    activity_columns.every((col) => {
      const val = lig[col];
      return val != null && isFinite(val) && val > 0;
    }),
  );
  const transformed = filtered.map((lig) => {
    const out = { ...lig };
    new_columns.forEach((col, i) => {
      out[col] = needsTransform[i]
        ? -1 * Math.log10(lig[activity_columns[i]] * 10e-9)
        : lig[activity_columns[i]];
    });
    return out;
  });
  return { mol_data: transformed, activity_columns: new_columns };
}

// ── Shared fingerprint core ────────────────────────────────────────────────────
async function generateFingerprintsForMols(mol_data, formStuff, requestId) {
  const RDKit = await loadRDKit();
  const settings = formStuff ?? {
    fingerprint: "maccs",
    radius: 2,
    nBits: 1024,
  };
  return generateFingerprints(mol_data, settings, RDKit, requestId);
}

// ── Public API — unchanged signatures ─────────────────────────────────────────

// Full pipeline: validate → strip salts → stereo → dedup → log10 → fingerprint
async function processFingerprintData(params, requestId) {
  const settings = params.formStuff ?? {
    fingerprint: "maccs",
    radius: 2,
    nBits: 1024,
    dedup: true,
    log10: true,
  };
  const RDKit = await loadRDKit();

  let { mol_data, activity_columns } = params;

  mol_data = filterValidSmiles(mol_data, RDKit);
  mol_data = stripSalts(mol_data, RDKit);
  mol_data = resolveStereochemistry(mol_data, activity_columns, RDKit);
  if (settings.dedup) mol_data = deduplicate(mol_data);
  if (settings.log10)
    ({ mol_data, activity_columns } = applyLog10Transform(
      mol_data,
      activity_columns,
    ));

  const clean = await generateFingerprints(
    mol_data,
    settings,
    RDKit,
    requestId,
  );
  notify({
    id: requestId,
    function: "fingerprint",
    data: clean,
    activity_columns,
    settings,
  });
  notify({ id: requestId, message: "Processing Done" });
}

// Fingerprint only — no pre-processing, used for ML screening
async function makeFingerprints(params, requestId) {
  const processed = await generateFingerprintsForMols(
    params.mol_data,
    params.formStuff,
    requestId,
  );
  notify({ id: requestId, function: "only_fingerprint", results: processed });
  notify({ id: requestId, message: "Processing Done" });
}

function scaffoldArrayGetter(row_list_s, activity_columns, requestId) {
  const curr_activity_column = row_list_s.map(
    (obj) => obj[activity_columns[0]],
  );
  const massive_array = [];

  loadRDKit()
    .then((RDKit) => {
      for (let i = 0; i < row_list_s.length; i++) {
        const x = row_list_s[i];
        let mol;
        try {
          mol = RDKit.get_mol(x.canonical_smiles);
          const mol_frags = mol.get_mmpa_frags(1, 1, 20);
          try {
            const sidechains_smiles_list = [];
            const cores_smiles_list = [];

            if (!mol_frags.sidechains || !mol_frags.cores) {
              console.warn(`Skipping molecule ${i}: null sidechains/cores`);
              continue; // ← skip to next iteration, still hits the finally below
            }

            while (!mol_frags.sidechains.at_end()) {
              let sidechain;
              try {
                sidechain = mol_frags.sidechains.next();
                const { molList } = sidechain.get_frags();
                const fragments = [];
                try {
                  while (!molList.at_end()) {
                    const frag = molList.next();
                    try {
                      fragments.push(frag.get_smiles());
                    } finally {
                      safeDelete(frag);
                    }
                  }
                } finally {
                  safeDelete(molList);
                }
                if (fragments.length >= 2) {
                  cores_smiles_list.push(fragments[0]);
                  sidechains_smiles_list.push(fragments[1]);
                  massive_array.push([
                    x.canonical_smiles,
                    fragments[0],
                    fragments[1],
                    x.id,
                    x[activity_columns[0]],
                  ]);
                }
              } catch (e) {
                console.warn(
                  `MMA frag error for ${x.canonical_smiles}:`,
                  e?.message || e,
                );
              } finally {
                safeDelete(sidechain);
              }
            }
            row_list_s[i].Cores = cores_smiles_list;
            row_list_s[i].R_Groups = sidechains_smiles_list;
          } finally {
            safeDelete(mol_frags.cores, mol_frags.sidechains);
          }
        } catch (e) {
          console.warn(`Scaffold error for molecule ${i}:`, e?.message || e);
        } finally {
          safeDelete(mol);
        }
      }
      processScaffoldResults(curr_activity_column, massive_array, requestId);
    })
    .catch((e) => notifyError(requestId, "mma", e));
}

function processScaffoldResults(
  curr_activity_column,
  massive_array,
  requestId,
) {
  const countArray = {};
  for (const row of massive_array) {
    if (row.length >= 5) {
      const key = row[1];
      if (!countArray[key]) countArray[key] = [0, []];
      countArray[key][0]++;
      countArray[key][1].push(row[4]);
    }
  }
  let scaffoldArray = Object.entries(countArray)
    .filter(
      ([key, count]) =>
        typeof count[0] === "number" && count[0] >= 2 && key.length > 9,
    )
    .map((x) => [x[0], [x[1][0], ksTest(x[1][1], curr_activity_column)]]);
  scaffoldArray.sort((a, b) => a[1][1] - b[1][1]);
  notify({
    id: requestId,
    function: "mma",
    data: [scaffoldArray, massive_array],
  });
}

// KS Test
function ksStatistic(obsOne, obsTwo) {
  const cdfOne = obsOne.slice().sort((a, b) => a - b);
  const cdfTwo = obsTwo.slice().sort((a, b) => a - b);
  let i = 0,
    j = 0,
    d = 0,
    fn1 = 0,
    fn2 = 0;
  while (i < cdfOne.length && j < cdfTwo.length) {
    const d1 = cdfOne[i],
      d2 = cdfTwo[j];
    if (d1 <= d2) {
      i++;
      fn1 = i / cdfOne.length;
    }
    if (d2 <= d1) {
      j++;
      fn2 = j / cdfTwo.length;
    }
    d = Math.max(d, Math.abs(fn2 - fn1));
  }
  return d;
}

function ksSignificance(alam) {
  let fac = 2,
    sum = 0,
    termBf = 0;
  const a2 = -2 * alam * alam;
  for (let j = 1; j <= 100; j++) {
    const term = fac * Math.exp(a2 * j * j);
    sum += term;
    if (Math.abs(term) <= 0.001 * termBf || Math.abs(term) <= 1e-8 * sum)
      return sum;
    fac = -fac;
    termBf = Math.abs(term);
  }
  return 1.0;
}

function ksTest(obsOne, obsTwo) {
  const en = Math.sqrt(
    (obsOne.length * obsTwo.length) / (obsOne.length + obsTwo.length),
  );
  return ksSignificance(en + 0.12 + 0.11 / en);
}

async function tanimoto_gen(params, requestId) {
  self.importScripts("https://unpkg.com/mathjs@15.1.0/lib/browser/math.js");
  const RDKitInstance = await loadRDKit();

  const { fp_dets, anchorMol, mol_data } = params;
  const fpType = fp_dets.type;
  const def = getFpDef(fpType);

  // Build fp-specific settings from fp_dets fields
  // Legacy: fp_dets.path → radius (Morgan) or minPath (rdkit_fp)
  const fpSettings = buildNormalisedFpSettings(fpType, {
    radius: fp_dets.path, // Morgan alias
    minPath: fp_dets.path, // rdkit_fp alias
    nBits: fp_dets.nBits,
    ...fp_dets, // pass through any extra fields (includeChirality etc.)
  });

  let mol;
  try {
    mol = RDKitInstance.get_mol(anchorMol);
  } catch (e) {
    notify({
      id: requestId,
      function: "tanimoto",
      error: `Invalid anchor molecule: ${e?.message || e}`,
    });
    return;
  }

  let molFP;
  try {
    const bitString = computeFpBitString(mol, def, fpSettings);
    molFP = bitStringToBitVector(bitString);
  } catch (e) {
    notify({ id: requestId, function: "tanimoto", error: e?.message || e });
    return;
  } finally {
    safeDelete(mol);
  }

  for (let i = 0; i < mol_data.length; i++) {
    mol_data[i][`${anchorMol}_tanimoto`] = TanimotoSimilarity(
      molFP,
      mol_data[i].fingerprint,
    );
    notify({
      message: `Progress: ${Math.round((i / mol_data.length) * 100)}%`,
      id: requestId,
    });
  }
  notify({ id: requestId, function: "tanimoto", data: mol_data });
}

function TanimotoSimilarity(v1, v2) {
  const numer = math.dot(v1, v2);
  if (numer === 0) return 0;
  const denom =
    math.number(math.square(math.norm(v1, 2))) +
    math.number(math.square(math.norm(v2, 2))) -
    numer;
  return denom === 0 ? 0 : numer / denom;
}

async function substructure_search(params, requestId) {
  const { ligand, searchSmi } = params;
  const RDKitInstance = await loadRDKit();
  let query;
  try {
    query = RDKitInstance.get_mol(searchSmi);
  } catch (e) {
    notify({
      id: requestId,
      function: "substructure_search",
      error: `Invalid query SMILES: ${e?.message || e}`,
    });
    return;
  }

  const searchResults = [];
  try {
    for (const lig of ligand) {
      let mol;
      try {
        mol = RDKitInstance.get_mol(lig.canonical_smiles);
        const match = JSON.parse(mol.get_substruct_match(query));
        if (!isEmpty(match)) searchResults.push(lig);
      } catch (e) {
        console.warn(
          `Substructure skip ${lig.canonical_smiles}:`,
          e?.message || e,
        );
      } finally {
        safeDelete(mol);
      }
    }
  } finally {
    safeDelete(query);
  }
  notify({
    id: requestId,
    function: "substructure_search",
    results: searchResults,
  });
}

async function scaffold_network(params, requestId) {
  const RDKitInstance = await loadRDKit();
  try {
    const network_graphs = scaffold_net_chunking_method(
      params.smiles_list,
      600,
      RDKitInstance,
      params,
    );
    const image_graph = graph_molecule_image_generator(
      RDKitInstance,
      network_graphs,
    );
    notify({ message: "Scaffold Network Ready", id: requestId });
    notify({ id: requestId, function: "scaffold_network", data: image_graph });
  } catch (e) {
    notify({
      id: requestId,
      function: "scaffold_network",
      error: e?.message || e,
    });
  }
}

function colorOfEdge(edge) {
  const colors = {
    Fragment: "#99ccff",
    Generic: "#ff9999",
    GenericBond: "#99ff99",
    RemoveAttachment: "#666666",
  };
  return colors[edge] ?? "#cccc66";
}

function scaffold_net_chunking_method(array, chunkSize, rdkit, params) {
  const scaffold_net_ins = new rdkit.ScaffoldNetwork();
  scaffold_net_ins.set_scaffold_params(JSON.stringify(params));
  let network;

  try {
    for (let i = 0; i < array.length; i += chunkSize) {
      const smiles_mol_list = molListFromSmiArray(
        array.slice(i, i + chunkSize),
        rdkit,
      );
      try {
        network = scaffold_net_ins.update_scaffold_network(smiles_mol_list);
      } catch (e) {
        console.error(`Scaffold network chunk ${i} error:`, e?.message || e);
      } finally {
        safeDelete(smiles_mol_list);
      }
    }
  } finally {
    safeDelete(scaffold_net_ins);
  }

  const nodes = [];
  for (let i = 0; i < network.nodes.size(); i++) {
    try {
      const smiles_string = network.nodes.get(i);
      nodes.push({
        id: i.toString(),
        smiles: smiles_string,
        molCounts: network.molCounts.get(i),
        nodeType: array.includes(smiles_string) ? "whole" : "fragment",
      });
    } catch (e) {
      console.warn(`Scaffold node ${i} error:`, e?.message || e);
    }
  }

  const edges = [];
  for (let i = 0; i < network.edges.size(); i++) {
    try {
      const edge = network.edges.get(i);
      edges.push({
        id: i.toString(),
        source: edge.beginIdx.toString(),
        target: edge.endIdx.toString(),
        label: edge.type,
        color: colorOfEdge(edge.type),
      });
    } catch (e) {
      console.warn(`Scaffold edge ${i} error:`, e?.message || e);
    }
  }
  return { nodes, edges };
}

function graph_molecule_image_generator(rdkit, graphData, svgSize = 120) {
  for (const node of graphData.nodes) {
    let mol;
    try {
      mol = rdkit.get_mol(node.smiles);
      const svg = mol.get_svg(svgSize, svgSize);
      node.image = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml" }),
      );
    } catch (e) {
      console.warn(`SVG gen failed for ${node.smiles}:`, e?.message || e);
    } finally {
      safeDelete(mol);
    }
  }
  return graphData;
}

async function calcPhysChemDescriptors(params, requestId) {
  const RDKitInstance = await loadRDKit();
  const ligand = params.ligand;
  const results = [];

  for (let i = 0; i < ligand.length; i++) {
    const lig = ligand[i];
    try {
      const mol = RDKitInstance.get_mol(lig.canonical_smiles);
      const raw = JSON.parse(mol.get_descriptors());
      mol.delete();
      results.push({
        id: lig.id,
        MW: raw.amw != null ? parseFloat(raw.amw.toFixed(2)) : null,
        LogP: raw.CrippenClogP != null ? parseFloat(raw.CrippenClogP.toFixed(2)) : null,
        HBA: raw.lipinskiHBA ?? null,
        HBD: raw.lipinskiHBD ?? null,
        TPSA: raw.tpsa != null ? parseFloat(raw.tpsa.toFixed(1)) : null,
        RotBonds: raw.NumRotatableBonds ?? null,
        Rings: raw.NumRings ?? null,
        AromaticRings: raw.NumAromaticRings ?? null,
        HeavyAtoms: raw.NumHeavyAtoms ?? null,
        Fsp3: raw.FractionCSP3 != null ? parseFloat(raw.FractionCSP3.toFixed(3)) : null,
      });
    } catch (e) {
      results.push({ id: lig.id });
    }
  }

  notify({ id: requestId, function: 'physchem_descriptors', results });
}