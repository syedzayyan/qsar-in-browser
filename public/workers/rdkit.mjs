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

// ============================
// Fingerprint registry
// ============================
//
// Every fingerprint available in RDKit MinimalLib (minilib.h) is declared here.
// Keys are the stable string IDs used throughout this file and by callers.
//
// method      – mol method name (bitstring variant, returned by get_*_fp())
// defaultParams – parameters accepted by the JSON details argument, with defaults.
//                 Pass only the keys you want to override; omit to use defaults.
// paramKeys   – which of defaultParams are forwarded in the JSON details string
//               (some FPs ignore certain keys, so we only send what the C++ reads).
//
// Notes:
//  • get_maccs_fp() accepts NO details argument – always called with no args.
//  • get_morgan_fp(details) reads: radius, nBits, useChirality, useBondTypes,
//    useFeatures, useCounts, includeRedundantEnvironments
//  • get_rdkit_fp(details) reads: minPath, maxPath, nBits, useHs, branchedPaths,
//    useBondOrder, countSimulation
//  • get_atom_pair_fp(details) reads: nBits, minDistance, maxDistance,
//    includeChirality, use2D, countSimulation
//  • get_topological_torsion_fp(details) reads: nBits, includeChirality,
//    countSimulation
//  • get_pattern_fp(details) reads: nBits, tautomerFingerprints
//
const FP_REGISTRY = {
  maccs: {
    label: "MACCS (166-bit)",
    method: "get_maccs_fp",
    fixedLength: 167, // always 167 bits – nBits has no effect
    defaultParams: {},
    paramKeys: [], // no JSON details argument
  },
  morgan: {
    label: "Morgan (ECFP-like)",
    method: "get_morgan_fp",
    defaultParams: {
      radius: 2,
      nBits: 2048,
      useChirality: false,
      useBondTypes: true,
      useFeatures: false,
    },
    paramKeys: [
      "radius",
      "nBits",
      "useChirality",
      "useBondTypes",
      "useFeatures",
    ],
  },
  rdkit_fp: {
    label: "RDKit (Daylight-like)",
    method: "get_rdkit_fp",
    defaultParams: {
      minPath: 1,
      maxPath: 7,
      nBits: 2048,
      useHs: true,
      branchedPaths: true,
      useBondOrder: true,
    },
    paramKeys: [
      "minPath",
      "maxPath",
      "nBits",
      "useHs",
      "branchedPaths",
      "useBondOrder",
    ],
  },
  atom_pair: {
    label: "Atom Pair",
    method: "get_atom_pair_fp",
    defaultParams: {
      nBits: 2048,
      minDistance: 1,
      maxDistance: 30,
      includeChirality: false,
      use2D: true,
    },
    paramKeys: [
      "nBits",
      "minDistance",
      "maxDistance",
      "includeChirality",
      "use2D",
    ],
  },
  topological_torsion: {
    label: "Topological Torsion",
    method: "get_topological_torsion_fp",
    defaultParams: { nBits: 2048, includeChirality: false },
    paramKeys: ["nBits", "includeChirality"],
  },
  pattern: {
    label: "Pattern (substructure screening)",
    method: "get_pattern_fp",
    defaultParams: { nBits: 2048, tautomerFingerprints: false },
    paramKeys: ["nBits", "tautomerFingerprints"],
  },
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

// Treat activity values as matching if they're numerically close rather than
// requiring byte-identical equality — real assay data is rarely bit-exact
// across repeat/duplicate measurements of the same compound.
const ACTIVITY_MATCH_RELATIVE_TOLERANCE = 1e-3;
function activityValuesMatch(a, b) {
  if (a === b) return true;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false;
  const scale = Math.max(Math.abs(na), Math.abs(nb), 1e-9);
  return Math.abs(na - nb) / scale <= ACTIVITY_MATCH_RELATIVE_TOLERANCE;
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

  const primaryCol = activity_columns?.[0];
  let conflictGroups = 0;
  let conflictRowsDropped = 0;

  const result = [];
  for (const [stripped, group] of groups) {
    const { _stripped, ...first } = group[0];
    if (group.length === 1) {
      result.push(first);
      continue;
    }
    const allMatch = group.every((lig) =>
      activity_columns.every((col) =>
        activityValuesMatch(lig[col], group[0][col]),
      ),
    );
    if (allMatch) {
      result.push({ ...first, canonical_smiles: stripped });
      continue;
    }

    // Conflicting stereoisomers with different labels — rather than
    // dropping the whole group, keep one representative row (closest to
    // the group's median on the primary activity column) and report how
    // many rows that collapsed, so the loss is visible instead of silent.
    conflictGroups += 1;
    conflictRowsDropped += group.length - 1;

    let representative = group[0];
    if (primaryCol) {
      const values = group
        .map((lig) => Number(lig[primaryCol]))
        .filter((v) => !isNaN(v));
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median =
          sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
        representative = group.reduce((best, lig) => {
          const v = Number(lig[primaryCol]);
          if (isNaN(v)) return best;
          const bestV = Number(best[primaryCol]);
          return Math.abs(v - median) < Math.abs(bestV - median) ? lig : best;
        }, group[0]);
      }
    }

    const { _stripped: _omit, ...rest } = representative;
    result.push({ ...rest, canonical_smiles: stripped });
  }
  return { result, conflictGroups, conflictRowsDropped };
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
  const startCount = mol_data.length;

  mol_data = filterValidSmiles(mol_data, RDKit);
  const invalidSmilesRemoved = startCount - mol_data.length;

  mol_data = stripSalts(mol_data, RDKit);

  const stereo = resolveStereochemistry(mol_data, activity_columns, RDKit);
  mol_data = stereo.result;

  let duplicatesRemoved = 0;
  if (settings.dedup) {
    const beforeDedup = mol_data.length;
    mol_data = deduplicate(mol_data);
    duplicatesRemoved = beforeDedup - mol_data.length;
  }

  let log10FilteredOut = 0;
  if (settings.log10) {
    const beforeLog10 = mol_data.length;
    ({ mol_data, activity_columns } = applyLog10Transform(
      mol_data,
      activity_columns,
    ));
    log10FilteredOut = beforeLog10 - mol_data.length;
  }

  const clean = await generateFingerprints(
    mol_data,
    settings,
    RDKit,
    requestId,
  );

  const report = {
    startCount,
    invalidSmilesRemoved,
    stereoConflictGroups: stereo.conflictGroups,
    stereoConflictRowsDropped: stereo.conflictRowsDropped,
    duplicatesRemoved,
    log10FilteredOut,
    finalCount: clean.length,
  };

  notify({
    id: requestId,
    function: "fingerprint",
    data: clean,
    activity_columns,
    settings,
    report,
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

// ============================
// GA functions
// ============================

/**
 * scoreSmilesBatch
 *
 * fpSettings shape (all optional):
 *   fingerprint          – FP_REGISTRY key            (default: 'maccs')
 *   + any FP-specific params (radius, nBits, etc.)
 */
async function scoreSmilesBatch(
  smilesArray,
  modelKind = "regression",
  fpSettings = {},
  scoringModel = "classical",
) {
  const RDKit = await loadRDKit();

  if (scoringModel === "dmpnn") {
    if (!self._dmpnnHandle || !self._dmpnnDMPNN) {
      throw new Error("No DMPNN model loaded — train or load weights first");
    }
    const DMPNN = self._dmpnnDMPNN;
    return smilesArray.map((smi) => {
      const graph = molToGraphSafe(RDKit, smi);
      if (!graph) return 0; // invalid mol → neutral score, don't break GA
      const pred = dmpnnInfer(DMPNN, self._dmpnnHandle, graph);
      return pred[0] ?? 0;
    });
  }

  // ── Classical: fingerprint → Pyodide ─────────────────────────────────────
  const fpType = fpSettings.fingerprint ?? "maccs";
  const def = getFpDef(fpType);
  const normSettings = buildNormalisedFpSettings(fpType, fpSettings);
  const fps = [];

  for (const smi of smilesArray) {
    let mol;
    try {
      mol = RDKit.get_mol(smi);
      if (!mol?.is_valid()) throw new Error("Invalid molecule");
      const bitString = computeFpBitString(mol, def, normSettings);
      fps.push(bitStringToBitVector(bitString));
    } catch (e) {
      console.warn(`scoreSmilesBatch: skipping "${smi}": ${e?.message || e}`);
      fps.push(null);
    } finally {
      safeDelete(mol);
    }
  }

  const validFps = fps.filter(Boolean).map((fp) => new Float32Array(fp));
  if (validFps.length === 0)
    throw new Error("No valid fingerprints for scoring");

  const optsNum = modelKind === "classification" ? 2 : 1;
  const raw = await callPyodide({
    func: "score_batch",
    fp: validFps,
    params: { model: optsNum },
  });
  return modelKind === "classification"
    ? raw.map((r) => (Array.isArray(r) ? r[0] : r))
    : raw;
}

async function mutateBatch(smilesArray) {
  const RDKitInstance = await loadRDKit();
  const offspring = [];

  for (const smi of smilesArray) {
    let mol;
    try {
      mol = RDKitInstance.get_mol(smi);
      if (!mol?.is_valid()) throw new Error("Invalid molecule");

      let mutated = smi;
      let success = false;

      for (let attempt = 0; attempt < 10 && !success; attempt++) {
        let rxn, molList, products;
        try {
          const rxnSmarts = generateMutationSmarts(smi, RDKitInstance);
          rxn = RDKitInstance.get_rxn(rxnSmarts);
          molList = molListFromSmiArray([smi], RDKitInstance);
          products = rxn.run_reactants(molList, 10);

          const productCount = products.size();
          for (let i = 0; i < productCount; i++) {
            const prodList = products.get(i);
            let prodMol, newMol;
            try {
              prodMol = prodList.next();
              if (!success && prodMol?.is_valid()) {
                const newSmi = prodMol.get_smiles();
                newMol = RDKitInstance.get_mol(newSmi);
                if (
                  newMol?.is_valid() &&
                  newMol.get_num_atoms() <= 80 &&
                  !newSmi.includes(".")
                ) {
                  mutated = newSmi;
                  success = true;
                }
              }
            } catch (e) {
              console.warn(`Product processing failed: ${e?.message || e}`);
            } finally {
              safeDelete(newMol, prodMol, prodList);
            }
          }
        } catch (e) {
          console.warn(
            `Mutation attempt ${attempt + 1} failed for "${smi}": ${e?.message || e}`,
          );
        } finally {
          safeDelete(products, molList, rxn);
        }
      }

      offspring.push(mutated);
    } catch (e) {
      console.warn(
        `mutateBatch: keeping original for "${smi}": ${e?.message || e}`,
      );
      offspring.push(smi);
    } finally {
      safeDelete(mol);
    }
  }

  return offspring;
}

// ── runGA — add scoringModel param ────────────────────────────────────────────
async function runGA(params) {
  try {
    const {
      zincSmiles,
      populationSize = 5,
      offspringSize = 5,
      maxGenerations = 50,
      modelKind = "regression",
      fingerprint = "maccs",
      scoringModel = "classical", // ← "classical" | "dmpnn"
      id,
      ...rest
    } = params;

    if (!zincSmiles || zincSmiles.length < populationSize) {
      throw new Error(
        `Not enough seed SMILES: need ${populationSize}, got ${zincSmiles?.length ?? 0}`,
      );
    }

    // Validate DMPNN readiness upfront — fail fast before any generation
    if (scoringModel === "dmpnn" && (!self._dmpnnHandle || !self._dmpnnDMPNN)) {
      throw new Error("scoringModel=dmpnn but no DMPNN model is loaded");
    }

    gaCancelled = false;

    const fpSettings = {
      fingerprint,
      radius: rest.fpRadius ?? rest.radius,
      minPath: rest.fpRadius ?? rest.minPath,
      nBits: rest.fpNBits ?? rest.nBits,
      ...rest,
    };

    let population = zincSmiles.slice(0, populationSize);
    let scores = await scoreSmilesBatch(
      population,
      modelKind,
      fpSettings,
      scoringModel,
    );

    for (let gen = 0; gen < maxGenerations; gen++) {
      if (gaCancelled) {
        notify({ id, type: "ga_cancelled", gen });
        return null;
      }

      const ranked = population
        .map((smi, i) => ({ smi, score: scores[i] }))
        .sort((a, b) => b.score - a.score);

      const topK = Math.max(
        1,
        Math.min(Math.floor(populationSize * 0.2), ranked.length),
      );
      const parents = Array.from(
        { length: offspringSize },
        () => ranked[Math.floor(Math.random() * topK)].smi,
      );

      const offspring = await mutateBatch(parents);
      const offspringScores = await scoreSmilesBatch(
        offspring,
        modelKind,
        fpSettings,
        scoringModel,
      );

      const poolRanked = [...population, ...offspring]
        .map((smi, i) => ({ smi, score: [...scores, ...offspringScores][i] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, populationSize);

      population = poolRanked.map((x) => x.smi);
      scores = poolRanked.map((x) => x.score);

      notify({
        type: "ga_progress",
        gen,
        best: scores[0],
        bestSmiles: population[0],
        id,
      });
    }

    return { population, scores };
  } catch (e) {
    console.error(`runGA failed: ${e?.message || e}`);
    throw e;
  }
}

// ============================
// DMPNN Stuff
// ============================

// Standard atomic weights, indexed by atomic number (1-83). Covers everything
// likely to appear in drug-like QSAR datasets; falls back to a rough z*2
// estimate beyond that (only ever hit for exotic/heavy elements).
const ATOMIC_MASSES = [
  null, 1.008, 4.003, 6.94, 9.012, 10.81, 12.011, 14.007, 15.999, 18.998,
  20.18, 22.99, 24.305, 26.982, 28.085, 30.974, 32.06, 35.45, 39.948, 39.098,
  40.078, 44.956, 47.867, 50.942, 51.996, 54.938, 55.845, 58.933, 58.693,
  63.546, 65.38, 69.723, 72.63, 74.922, 78.971, 79.904, 83.798, 85.468, 87.62,
  88.906, 91.224, 92.906, 95.95, 98, 101.07, 102.91, 106.42, 107.87, 112.41,
  114.82, 118.71, 121.76, 127.6, 126.9, 131.29, 132.91, 137.33, 138.91, 140.12,
  140.91, 144.24, 145, 150.36, 151.96, 157.25, 158.93, 162.5, 164.93, 167.26,
  168.93, 173.05, 174.97, 178.49, 180.95, 183.84, 186.21, 190.23, 192.22,
  195.08, 196.97, 200.59, 204.38, 207.2, 208.98,
];
function atomicMass(z) {
  return ATOMIC_MASSES[z] ?? z * 2.0;
}

// RDKit BondStereo string → enum ordinal (matches Chemprop's MultiHotBondFeaturizer
// default `stereos=range(6)`: NONE=0, ANY=1, Z=2, E=3, CIS=4, TRANS=5).
const BOND_STEREO_TO_INT = {
  unspecified: 0,
  any: 1,
  z: 2,
  e: 3,
  cis: 4,
  trans: 5,
};

// One-hot helper matching Chemprop's `choices.get(feat, len(choices))` pattern:
// known values map to their list position, unknown values fall into a trailing
// "other" bucket. `choices` may be a Map (value → index) for non-contiguous
// lookups, or an array (identity index == value, e.g. degree/numHs/chiral tag).
function multiHot(value, choices) {
  const size = choices instanceof Map ? choices.size : choices.length;
  const idx =
    choices instanceof Map
      ? (choices.has(value) ? choices.get(value) : size)
      : (() => {
          const i = choices.indexOf(value);
          return i === -1 ? size : i;
        })();
  const v = new Array(size + 1).fill(0);
  v[idx] = 1;
  return v;
}

// atomic_nums = range(1,37) + [53] → position-by-value lookup (37 known + other = 38 dims)
const ATOMIC_NUM_CHOICES = new Map(
  [...Array.from({ length: 36 }, (_, i) => i + 1), 53].map((z, i) => [z, i]),
);
const DEGREE_CHOICES = [0, 1, 2, 3, 4, 5]; // identity, 6 + other = 7
// formal_charges = [-1,-2,1,2,0] → position-by-value (5 + other = 6)
const FORMAL_CHARGE_CHOICES = new Map([-1, -2, 1, 2, 0].map((c, i) => [c, i]));
const CHIRAL_TAG_CHOICES = [0, 1, 2, 3]; // identity (RDKit ChiralType ordinal), 4 + other = 5
const NUM_HS_CHOICES = [0, 1, 2, 3, 4]; // identity, 5 + other = 6
// Chemprop v2's hybridization list is [S, SP, SP2, SP2D, SP3, SP3D, SP3D2]
// → 7 known + other = 8 dims. "S" = unhybridized (e.g. an isolated atom).
const HYBRIDIZATION_CHOICES = ["S", "SP", "SP2", "SP2D", "SP3", "SP3D", "SP3D2"];

/**
 * Hybridization is not exposed anywhere in RDKit-JS's minimal-build JSON, so
 * it's derived with a standard valence heuristic. This matches desktop RDKit
 * for the vast majority of organic/drug-like atoms, but can diverge on
 * resonance-delocalized or hypervalent centers (e.g. amide N, sulfonyl S)
 * that RDKit's own perception treats specially.
 */
function deriveHybridization(totalDegree, nDoubleBonds, nTripleBonds, isAromatic) {
  if (isAromatic) return "SP2";
  if (totalDegree >= 5) return totalDegree === 5 ? "SP3D" : "SP3D2";
  if (nTripleBonds >= 1 || nDoubleBonds >= 2) return "SP";
  if (nDoubleBonds === 1) return "SP2";
  if (totalDegree === 0) return "S"; // falls into Chemprop's "other" bucket
  return "SP3";
}

function molToGraph(rdkitMol) {
  const raw = JSON.parse(rdkitMol.get_json());
  const mol = raw.molecules[0];
  const atoms = mol.atoms ?? [];
  const bonds = mol.bonds ?? [];
  const ext = mol.extensions?.find((e) => e.name === "rdkitRepresentation") ?? {};

  if (!atoms.length) throw new Error("No atoms found in molecule JSON");

  const ATOM_DIM = 72;
  const BOND_DIM = 14;
  const n_atoms = atoms.length;
  const n_bonds = bonds.length;
  const n_dir_edges = 2 * n_bonds;

  const aromaticAtoms = new Set(ext.aromaticAtoms ?? []);
  const aromaticBonds = new Set(ext.aromaticBonds ?? []);

  // Ring-bond membership: a bond is "in ring" if its two endpoints are
  // adjacent within any of the molecule's (SSSR) rings.
  const ringBondPairs = new Set();
  for (const ring of ext.atomRings ?? []) {
    for (let i = 0; i < ring.length; i++) {
      const u = ring[i];
      const v = ring[(i + 1) % ring.length];
      ringBondPairs.add(u < v ? `${u}_${v}` : `${v}_${u}`);
    }
  }

  // Per-atom: explicit bonded-neighbour count, double/triple-bond counts, and
  // explicit-H-atom count (for SMILES with literal "[H]" atom nodes).
  const explicitDegree = new Array(n_atoms).fill(0);
  const explicitHCount = new Array(n_atoms).fill(0);
  const doubleBondCount = new Array(n_atoms).fill(0);
  const tripleBondCount = new Array(n_atoms).fill(0);

  for (let b = 0; b < n_bonds; b++) {
    const [u, v] = bonds[b].atoms;
    explicitDegree[u]++;
    explicitDegree[v]++;
    const order = aromaticBonds.has(b) ? null : (bonds[b].bo ?? 1);
    if (order === 2) {
      doubleBondCount[u]++;
      doubleBondCount[v]++;
    } else if (order === 3) {
      tripleBondCount[u]++;
      tripleBondCount[v]++;
    }
    if ((atoms[u].z ?? 6) === 1) explicitHCount[v]++;
    if ((atoms[v].z ?? 6) === 1) explicitHCount[u]++;
  }

  const hybridization = new Array(n_atoms);
  const totalDegree = new Array(n_atoms);
  for (let i = 0; i < n_atoms; i++) {
    const impHs = atoms[i].impHs ?? 0;
    totalDegree[i] = explicitDegree[i] + impHs;
    hybridization[i] = deriveHybridization(
      totalDegree[i],
      doubleBondCount[i],
      tripleBondCount[i],
      aromaticAtoms.has(i),
    );
  }

  // ── Atom features (order matches Chemprop's MultiHotAtomFeaturizer.v2()) ───
  const atom_features = new Float32Array(n_atoms * ATOM_DIM);

  for (let i = 0; i < n_atoms; i++) {
    const a = atoms[i];
    const z = a.z ?? 6;
    const numHs = (a.impHs ?? 0) + explicitHCount[i];
    const chiralTag = a.stereo === "cw" ? 1 : a.stereo === "ccw" ? 2 : 0;

    const feat = [
      ...multiHot(z, ATOMIC_NUM_CHOICES), // 38
      ...multiHot(totalDegree[i], DEGREE_CHOICES), // 7
      ...multiHot(a.chg ?? 0, FORMAL_CHARGE_CHOICES), // 6
      ...multiHot(chiralTag, CHIRAL_TAG_CHOICES), // 5
      ...multiHot(numHs, NUM_HS_CHOICES), // 6
      ...multiHot(hybridization[i], HYBRIDIZATION_CHOICES), // 7
      aromaticAtoms.has(i) ? 1.0 : 0.0, // 1
      0.01 * atomicMass(z), // 1
    ]; // 72 total
    atom_features.set(feat, i * ATOM_DIM);
  }

  // ── Edge index + bond features (order matches Chemprop's MultiHotBondFeaturizer) ──
  // [null-bit(1)=0, bond_type(4, no "other"), conjugated(1), in_ring(1), stereo(6+other=7)]
  const edge_index = new BigInt64Array(2 * n_dir_edges);
  const edge_attr = new Float32Array(n_dir_edges * BOND_DIM);

  for (let b = 0; b < n_bonds; b++) {
    const bond = bonds[b];
    const [src, dst] = bond.atoms;
    const isAromatic = aromaticBonds.has(b);
    const order = isAromatic ? null : (bond.bo ?? 1);

    const btVec = [0, 0, 0, 0]; // [single, double, triple, aromatic] — no "other" bucket
    if (isAromatic) btVec[3] = 1;
    else if (order === 1) btVec[0] = 1;
    else if (order === 2) btVec[1] = 1;
    else if (order === 3) btVec[2] = 1;
    // unrecognised order (e.g. dative bonds): all-zero, matching Chemprop

    const conjugated =
      (hybridization[src] === "SP" || hybridization[src] === "SP2") &&
      (hybridization[dst] === "SP" || hybridization[dst] === "SP2")
        ? 1.0
        : 0.0;
    const key = src < dst ? `${src}_${dst}` : `${dst}_${src}`;
    const inRing = ringBondPairs.has(key) ? 1.0 : 0.0;

    const stereoInt = BOND_STEREO_TO_INT[bond.stereo ?? "unspecified"] ?? 0;
    const stVec = new Array(7).fill(0);
    stVec[stereoInt >= 0 && stereoInt < 6 ? stereoInt : 6] = 1;

    const feat = [0, ...btVec, conjugated, inRing, ...stVec]; // 1+4+2+7=14

    // Forward edge src→dst
    edge_index[b] = BigInt(src);
    edge_index[b + n_bonds] = BigInt(dst);
    edge_attr.set(feat, b * BOND_DIM);

    // Reverse edge dst→src
    edge_index[n_dir_edges + b] = BigInt(dst);
    edge_index[n_dir_edges + b + n_bonds] = BigInt(src);
    edge_attr.set(feat, (b + n_bonds) * BOND_DIM);
  }

  return {
    n_atoms,
    n_dir_edges,
    atom_features,
    atom_features_shape: [n_atoms, ATOM_DIM],
    edge_index,
    edge_index_shape: [2, n_dir_edges],
    edge_attr,
    edge_attr_shape: [n_dir_edges, BOND_DIM],
  };
}

async function loadDMPNN() {
  if (!DMPNNInstancePromise) {
    DMPNNInstancePromise = new Promise(async (resolve, reject) => {
      try {
        const dmpnnWasmUrl = new URL(
          "/dmpnn_rust/dmpnn_wasm_bg.wasm",
          self.location.origin,
        ).href;

        // ✅ dynamic import instead of importScripts
        const {
          default: initDMPNN,
          model_new,
          model_free,
          model_train_step,
          model_train_step_batch,
          model_infer,
          model_get_config,
          model_get_weights, // ✅ add this
          model_load_weights, // ✅ and this while you're at it
        } = await import("/dmpnn_rust/dmpnn_wasm.js");

        await initDMPNN({ module_or_path: dmpnnWasmUrl });

        notify({ message: "DMPNN WASM Loaded" });
        resolve({
          model_new,
          model_free,
          model_train_step,
          model_train_step_batch,
          model_infer,
          model_get_config,
          model_get_weights, // ✅
          model_load_weights, // ✅
        });
      } catch (err) {
        DMPNNInstancePromise = null;
        reject(new Error(`DMPNN WASM failed to load: ${err?.message || err}`));
      }
    });
  }
  return DMPNNInstancePromise;
}

let DMPNNInstancePromise = null;

async function getDMPNN() {
  self._dmpnnDMPNN = self._dmpnnDMPNN ?? (await loadDMPNN());
  return self._dmpnnDMPNN;
}

function molToGraphSafe(RDKit, smi) {
  if (!smi || typeof smi !== "string") return null;
  let mol = null;
  try {
    mol = RDKit.get_mol(smi);
    if (!mol?.is_valid()) return null;
    const graph = molToGraph(mol);
    // ❌ if (!graph.n_dir_edges) return null;  ← drops single-atom mols + anything small
    if (!graph || graph.n_atoms === 0) return null; // ✅ only reject truly empty
    return graph;
  } catch (e) {
    console.warn(`molToGraphSafe failed for "${smi}":`, e?.message || e);
    return null;
  } finally {
    mol?.delete(); // ✅ also move delete here — was missing if molToGraph throws
  }
}

function dmpnnInfer(DMPNN, handle, graph) {
  return DMPNN.model_infer(
    handle,
    graph.atom_features,
    graph.n_atoms,
    graph.edge_index,
    graph.n_dir_edges,
    graph.edge_attr,
  );
}

function dmpnnTrainStep(DMPNN, handle, graph, label, lr) {
  return DMPNN.model_train_step(
    handle,
    graph.atom_features,
    graph.n_atoms,
    graph.edge_index,
    graph.n_dir_edges,
    graph.edge_attr,
    new Float32Array([label]),
    lr,
  );
}

function emitEpoch(fold, epoch, total_epochs, avg_loss) {
  self.postMessage({
    function: "dmpnn_train_epoch",
    fold,
    epoch,
    total_epochs,
    avg_loss,
  });
}

// Returns { loss_sum, count } for one epoch over a set of indices
async function runEpoch(
  DMPNN,
  handle,
  RDKit,
  smiles,
  labels,
  indices,
  lr,
  config,
) {
  if (config.batching && indices.length > 1) {
    const graphs = [];
    const validIndices = [];
    for (const i of indices) {
      const graph = molToGraphSafe(RDKit, smiles[i]);
      if (!graph) continue;
      graphs.push(graph);
      validIndices.push(i);
    }
    if (graphs.length === 0) return { loss_sum: 0, count: 0 };

    const mol_n_atoms = new Int32Array(graphs.map((g) => g.n_atoms));
    const mol_n_dir_edges = new Int32Array(graphs.map((g) => g.n_dir_edges));
    const total_atoms = mol_n_atoms.reduce((s, n) => s + n, 0);
    const total_edges = mol_n_dir_edges.reduce((s, n) => s + n, 0);

    // ── Derive dims from the actual graph, not hardcoded ──────────────────────
    const ATOM_DIM = graphs[0].atom_features_shape[1]; // 72
    const BOND_DIM = graphs[0].edge_attr_shape[1]; // 14

    const flat_atom_features = new Float32Array(total_atoms * ATOM_DIM); // ← was * 9
    const flat_edge_index = new BigInt64Array(2 * total_edges);
    const flat_edge_attr = new Float32Array(total_edges * BOND_DIM); // ← was * 3
    const batch_labels = new Float32Array(validIndices.map((i) => labels[i]));

    let atom_cursor = 0;
    let edge_cursor = 0;

    for (let g = 0; g < graphs.length; g++) {
      const graph = graphs[g];
      const atom_offset = atom_cursor;
      const edge_offset = edge_cursor;

      flat_atom_features.set(graph.atom_features, atom_offset * ATOM_DIM); // ← was * 9
      flat_edge_attr.set(graph.edge_attr, edge_offset * BOND_DIM); // ← was * 3

      const n = graph.n_dir_edges;
      const bigAtomOffset = BigInt(atom_offset);
      for (let e = 0; e < n; e++) {
        flat_edge_index[edge_offset + e] = graph.edge_index[e] + bigAtomOffset;
        flat_edge_index[total_edges + edge_offset + e] =
          graph.edge_index[n + e] + bigAtomOffset;
      }

      atom_cursor += graph.n_atoms;
      edge_cursor += graph.n_dir_edges;
    }

    const avg_loss = await DMPNN.model_train_step_batch(
      handle,
      flat_atom_features,
      mol_n_atoms,
      flat_edge_index,
      mol_n_dir_edges,
      flat_edge_attr,
      batch_labels,
      lr,
    );

    const count = graphs.length;
    return { loss_sum: isNaN(avg_loss) ? 0 : avg_loss * count, count };
  } else {
    let loss_sum = 0,
      count = 0;
    for (const i of indices) {
      const graph = molToGraphSafe(RDKit, smiles[i]);
      if (!graph) continue;
      const loss = dmpnnTrainStep(DMPNN, handle, graph, labels[i], lr);
      if (!isNaN(loss)) {
        loss_sum += loss;
        count++;
      }
    }
    return { loss_sum, count };
  }
}

function computeMetrics(test_preds, test_labels, is_cls) {
  const valid = test_preds
    .map((p, i) => ({ p, y: test_labels[i] }))
    .filter(({ p }) => p !== null);
  if (is_cls) {
    const acc =
      valid.filter(({ p, y }) => p >= 0.5 === y >= 0.5).length / valid.length;
    const auc = approxAUROC(
      valid.map((v) => v.y),
      valid.map((v) => v.p),
    );
    return [acc, auc];
  }
  const mae =
    valid.reduce((s, { p, y }) => s + Math.abs(p - y), 0) / valid.length;
  return [mae];
}

function approxAUROC(labels, scores) {
  const pos = scores.filter((_, i) => labels[i] >= 0.5);
  const neg = scores.filter((_, i) => labels[i] < 0.5);
  if (!pos.length || !neg.length) return 0.5;
  const u = pos.reduce((s, p) => s + neg.filter((n) => p > n).length, 0);
  return u / (pos.length * neg.length);
}

function storeFinalHandle(DMPNN, handle, config) {
  if (self._dmpnnHandle != null) DMPNN.model_free(self._dmpnnHandle);
  self._dmpnnHandle = handle;
  self._dmpnnDMPNN = DMPNN;
  self._dmpnnConfig = config; // ← persist so load_weights can reuse it
}

// ============================
// Message handler
// ============================
self.onmessage = async (event) => {
  const { function: funcName, id, ...params } = event.data;

  notify({ message: "RDKit worker started" });

  if (funcName === "cancel_ga") {
    gaCancelled = true;
    notify({ id, ok: true, type: "ga_cancelled" });
    return;
  }

  // Expose the FP registry so UI code can enumerate available fingerprints
  // without needing a separate import.
  if (funcName === "get_fp_registry") {
    notify({
      id,
      ok: true,
      function: "get_fp_registry",
      data: Object.fromEntries(
        Object.entries(FP_REGISTRY).map(([k, v]) => [
          k,
          {
            label: v.label,
            defaultParams: v.defaultParams,
            fixedLength: v.fixedLength ?? null,
          },
        ]),
      ),
    });
    return;
  }

  try {
    switch (funcName) {
      case "fingerprint":
        await processFingerprintData(params, id);
        break;

      case "only_fingerprint":
        await makeFingerprints(params, id);
        break;

      case "mma":
        scaffoldArrayGetter(params.mol_data, params.activity_columns, id);
        break;

      case "tanimoto":
        await tanimoto_gen(params, id);
        break;

      case "substructure_search":
        await substructure_search(params, id);
        break;

      case "scaffold_network":
        await scaffold_network(params, id);
        break;

      case "physchem_descriptors":
        await calcPhysChemDescriptors(params, id);
        break;

      case "run_ga": {
        const result = await runGA({ ...params, id });
        if (result) notify({ id, ok: true, type: "ga_complete", result });

        // Only tear down Pyodide if classical scoring was used
        if (params.scoringModel !== "dmpnn" && pyodideWorker) {
          pyodideWorker.terminate();
          pyodideWorker = null;
          pyodideCallbacks.clear();
        }
        break;
      }

      case "score_batch": {
        const scores = await scoreSmilesBatch(
          params.smiles,
          params.modelKind,
          params.fpSettings ?? {},
        );
        notify({ id, ok: true, result: scores });

        // Cleanup after standalone scoring
        if (pyodideWorker) {
          pyodideWorker.terminate();
          pyodideWorker = null;
          pyodideCallbacks.clear();
        }
        break;
      }

      case "DMPNN_train": {
        const DMPNN = await getDMPNN();
        const RDKit = await loadRDKit();
        const { smiles, labels, config, epochs } = params; // config now defined
        const all_indices = Array.from({ length: smiles.length }, (_, i) => i);

        storeFinalHandle(
          DMPNN,
          DMPNN.model_new(JSON.stringify(config)),
          config,
        );

        for (let epoch = 0; epoch < epochs; epoch++) {
          const { loss_sum, count } = await runEpoch(
            // ← uses batching if config.batching
            DMPNN,
            self._dmpnnHandle,
            RDKit,
            smiles,
            labels,
            all_indices,
            config.lr,
            config, // ← pass config as last arg
          );
          emitEpoch(null, epoch + 1, epochs, count > 0 ? loss_sum / count : 0);
        }
        break;
      }

      case "dmpnn_get_weights": {
        const DMPNN = self._dmpnnDMPNN;
        if (!DMPNN || self._dmpnnHandle == null) {
          notify({ id, ok: false, error: "No trained model — train first" });
          break;
        }
        const bytes = await DMPNN.model_get_weights(self._dmpnnHandle);
        self.postMessage({ function: "dmpnn_get_weights", bytes }, [
          bytes.buffer,
        ]);
        break;
      }

      case "dmpnn_infer_one": {
        const DMPNN = await getDMPNN();
        const RDKit = await loadRDKit();
        if (self._dmpnnHandle == null) {
          notify({ id, ok: false, error: "No trained model — train first" });
          break;
        }
        const graph = molToGraphSafe(RDKit, params.smiles);
        if (!graph) {
          notify({ id, ok: false, error: "Invalid SMILES" });
          break;
        }
        const pred = dmpnnInfer(DMPNN, self._dmpnnHandle, graph);
        self.postMessage({ function: "dmpnn_infer_one", result: pred[0] });
        break;
      }

      // ── Fix 1: dmpnn_load_weights fallback config ─────────────────────────────────
      case "dmpnn_load_weights": {
        const DMPNN = await getDMPNN();

        const config = params.config ??
          self._dmpnnConfig ?? {
            atom_dim: 72, // ← was 9
            bond_dim: 14, // ← was 3
            hidden_dim: 300,
            depth: 3,
            dropout: 0.0,
            ffn_hidden_dim: 300,
            ffn_num_layers: 3, // ← was 2 (Chemprop n_layers=2 → 3 weight matrices)
            num_tasks: 1,
            task_type: "regression",
            lr: 0.001,
          };

        if (self._dmpnnHandle != null) {
          await DMPNN.model_free(self._dmpnnHandle);
          self._dmpnnHandle = null;
        }

        const handle = await DMPNN.model_new(JSON.stringify(config));
        try {
          await DMPNN.model_load_weights(handle, params.bytes);
        } catch (e) {
          await DMPNN.model_free(handle);
          notify({
            id,
            ok: false,
            error: `model_load_weights failed: ${e?.message || e}`,
          });
          break;
        }

        self._dmpnnHandle = handle;
        self._dmpnnDMPNN = DMPNN;
        self._dmpnnConfig = config;
        notify({ function: "dmpnn_weights_loaded", ok: true });
        break;
      }

      case "dmpnn_infer_batch": {
        const DMPNN = await getDMPNN();
        const RDKit = await loadRDKit();
        if (self._dmpnnHandle == null) {
          self.postMessage({
            function: "dmpnn_infer_batch",
            ok: false,
            error: "No trained model",
            mol_data: params.mol_data,
          });
          break;
        }
        const results = params.smiles.map((smi) => {
          const graph = molToGraphSafe(RDKit, smi);
          return graph
            ? (dmpnnInfer(DMPNN, self._dmpnnHandle, graph)[0] ?? null)
            : null;
        });
        self.postMessage({
          function: "dmpnn_infer_batch",
          ok: true,
          results,
          mol_data: params.mol_data,
        });
        break;
      }

      case "DMPNN_train_kfold": {
        const DMPNN = await getDMPNN();
        const RDKit = await loadRDKit();
        const {
          smiles,
          labels,
          config,
          epochs,
          n_splits = 5,
          ids = [],
        } = params;
        const n_mols = smiles.length;
        const fold_size = Math.floor(n_mols / n_splits);
        const is_cls = config.task_type === "classification";
        const configJson = JSON.stringify(config);

        const fold_metrics = [];
        const per_fold_preds = [];

        for (let fold = 0; fold < n_splits; fold++) {
          const test_start = fold * fold_size;
          const test_end =
            fold === n_splits - 1 ? n_mols : test_start + fold_size;
          const train_idx = Array.from({ length: n_mols }, (_, i) => i).filter(
            (i) => i < test_start || i >= test_end,
          );
          const test_idx = Array.from(
            { length: test_end - test_start },
            (_, i) => i + test_start,
          );

          const foldHandle = await DMPNN.model_new(configJson);

          // Train
          for (let epoch = 0; epoch < epochs; epoch++) {
            const { loss_sum, count } = await runEpoch(
              // also needs await
              DMPNN,
              foldHandle,
              RDKit,
              smiles,
              labels,
              train_idx,
              config.lr,
              config,
            );
            emitEpoch(
              fold,
              epoch + 1,
              epochs,
              count > 0 ? loss_sum / count : 0,
            );
          }

          // Evaluate
          const test_preds = [];
          const fold_points = [];
          for (const i of test_idx) {
            const graph = molToGraphSafe(RDKit, smiles[i]);
            const pred = graph
              ? (dmpnnInfer(DMPNN, foldHandle, graph)[0] ?? null)
              : null;
            test_preds.push(pred);
            if (pred !== null) {
              fold_points.push({
                x: labels[i],
                y: pred,
                smiles: smiles[i],
                id: ids[i] ?? String(i),
              });
            }
          }
          per_fold_preds.push(fold_points);
          fold_metrics.push(
            computeMetrics(
              test_preds,
              test_idx.map((i) => labels[i]),
              is_cls,
            ),
          );
          await DMPNN.model_free(foldHandle);
        }

        // Final model on all data
        const finalHandle = DMPNN.model_new(configJson);
        const all_idx = Array.from({ length: n_mols }, (_, i) => i);
        for (let epoch = 0; epoch < epochs; epoch++) {
          const { loss_sum, count } = await runEpoch(
            DMPNN,
            finalHandle,
            RDKit,
            smiles,
            labels,
            all_idx,
            config.lr,
            config,
          );
          emitEpoch(
            n_splits,
            epoch + 1,
            epochs,
            count > 0 ? loss_sum / count : 0,
          );
        }
        storeFinalHandle(DMPNN, finalHandle, config);

        self.postMessage({
          function: "dmpnn_kfold_complete",
          metric1: fold_metrics.map((m) => m[0]),
          metric2: is_cls ? fold_metrics.map((m) => m[1]) : [],
          per_fold_preds,
        });
        break;
      }

      default:
        throw new Error(`Unknown function: "${funcName}"`);
    }
  } catch (error) {
    notifyError(id, funcName ?? "unknown", error);
  }
};
