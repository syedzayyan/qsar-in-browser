// unified_rdkit_worker.js
console.log('Unified RDKit Worker Activated');

const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;
let RDKitInstancePromise = null;

// Pyodide worker for ML scoring (GA only)
let pyodideWorker = null;
let pyodideJobId = 0;
const pyodideCallbacks = new Map();

// GA cancellation flag
let gaCancelled = false;

// ============================
// Notify helpers
// ============================
function notify(message) {
  self.postMessage(message);
}

function notifyError(id, funcName, error) {
  const msg = error?.message || String(error) || 'Unknown error';
  console.error(`[${funcName}] Error:`, error);
  notify({ id, ok: false, error: `[${funcName}] ${msg}` });
}

// ============================
// Utility functions
// ============================
function bitStringToBitVector(bitString) {
  return bitString.split('').map(bit => parseFloat(bit));
}

function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (value instanceof Map || value instanceof Set) return value.size === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// ============================
// Safe delete helper
// Centralises null-checks so call sites stay clean.
// ============================
function safeDelete(...objs) {
  for (const obj of objs) {
    try { obj?.delete(); } catch (_) { /* swallow – object may already be freed */ }
  }
}

// ============================
// RDKit loader
// ============================
async function loadRDKit() {
  if (!RDKitInstancePromise) {
    RDKitInstancePromise = new Promise((resolve, reject) => {
      try {
        self.importScripts('/rdkit/RDKit_minimal.js');
        initRDKitModule({ locateFile: () => rdkitWasmUrl })
          .then(mod => {
            notify({ message: mod.version() + ' Loaded' });
            resolve(mod);
          })
          .catch(err => {
            RDKitInstancePromise = null; // allow retry
            reject(new Error(`RDKit WASM failed to load: ${err?.message || err}`));
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
    pyodideWorker = new Worker('/workers/pyodide.mjs', { type: 'module' });
    pyodideWorker.onmessage = (event) => {
      const { id, ok, result, error } = event.data;
      const cb = pyodideCallbacks.get(id);
      pyodideCallbacks.delete(id); // always delete first
      if (!cb) return;
      if (ok) cb.resolve(result);
      else cb.reject(new Error(error || 'Pyodide worker error'));
    };
    pyodideWorker.onerror = (err) => {
      console.error('Pyodide worker uncaught error:', err);
    };
  }
  return pyodideWorker;
}

function callPyodide(msg, timeoutMs = 30000) {
  initPyodideWorker();
  return new Promise((resolve, reject) => {
    const id = ++pyodideJobId;

    const timer = setTimeout(() => {
      pyodideCallbacks.delete(id); // release the closure
      reject(new Error(`Pyodide timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    pyodideCallbacks.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); }
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
    { bo: "single", atoms: ["C", "N", "O", "F", "S", "Cl", "Br"], weights: Array(7).fill(1 / 7) },
    { bo: "double", atoms: ["C", "N", "O"], weights: Array(3).fill(1 / 3) },
    { bo: "triple", atoms: ["C", "N"], weights: [0.5, 0.5] },
  ];
  const choice = choices[weightedChoiceIndex([0.60, 0.35, 0.05])];
  const newAtom = weightedChoice(choice.atoms, choice.weights);
  if (choice.bo === "single") return `[*;!H0:1]>>[*:1]-${newAtom}`;
  if (choice.bo === "double") return `[*;!H0;!H1:1]>>[*:1]=${newAtom}`;
  return `[*;H3:1]>>[*:1]#${newAtom}`;
}

function insertAtomTemplate() {
  const choices = [
    { bo: "single", atoms: ["C", "N", "O", "S"], weights: Array(4).fill(1 / 4) },
    { bo: "double", atoms: ["C", "N"], weights: [0.5, 0.5] },
    { bo: "triple", atoms: ["C"], weights: [1.0] },
  ];
  const choice = choices[weightedChoiceIndex([0.60, 0.35, 0.05])];
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

// FIX: mol was not deleted when changeAtomTemplate returned early or threw.
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
    case 0: return insertAtomTemplate();
    case 1: return changeBondOrderTemplate();
    case 2: return deleteCyclicBondTemplate();
    case 3: return addRingTemplate();
    case 4: return deleteAtomTemplate();
    case 5: return changeAtomTemplate(smiles, RDKitInstance);
    case 6: return appendAtomTemplate();
    default: return deleteAtomTemplate();
  }
}

// ============================
// Fingerprint helpers
// ============================
async function generateFingerprints(ligandData, settings, RDKitInstance, requestId) {
  const fpTypeMap = { maccs: 'MACCS', morgan: 'Morgan', rdkit_fp: 'RDK' };
  const fpType = fpTypeMap[settings.fingerprint];
  const { radius: path, nBits } = settings;
  const results = [];

  for (let idx = 0; idx < ligandData.length; idx++) {
    const x = ligandData[idx];
    let mol;
    try {
      mol = RDKitInstance.get_mol(x.canonical_smiles);
      if (fpType === 'MACCS') {
        x.fingerprint = bitStringToBitVector(mol.get_maccs_fp());
      } else if (fpType === 'Morgan') {
        x.fingerprint = bitStringToBitVector(mol.get_morgan_fp(JSON.stringify({ radius: path, nBits })));
      } else if (fpType === 'RDK') {
        x.fingerprint = bitStringToBitVector(mol.get_rdkit_fp(JSON.stringify({ minPath: path, nBits })));
      }
      results.push(x);
      notify({ id: requestId, message: `Progress: ${Math.round((idx / ligandData.length) * 100)}%` });
    } catch (e) {
      console.warn(`Skipping molecule ${x.canonical_smiles}: ${e?.message || e}`);
    } finally {
      safeDelete(mol);
    }
  }
  return results;
}

// FIX: Each individual mol must be freed after MolList.append() — the MolList
// holds its own copy. The returned molList is the caller's responsibility.
function molListFromSmiArray(smiArray, rdkit) {
  const molList = new rdkit.MolList();
  for (const smiName of smiArray) {
    const [smi] = smiName.split(' ');
    let mol;
    try {
      mol = rdkit.get_mol(smi);
      molList.append(mol);
    } catch (e) {
      console.warn(`molListFromSmiArray: skipping invalid SMILES "${smi}": ${e?.message || e}`);
    } finally {
      safeDelete(mol);
    }
  }
  return molList;
}

// ============================
// Core processing functions
// ============================
async function processFingerprintData(params, requestId) {
  const RDKitInstance = await loadRDKit();
  const settings = params.formStuff ?? { fingerprint: 'maccs', radius: 2, nBits: 1024, dedup: true, log10: true };
  let { mol_data, activity_columns } = params;

  if (settings.log10) {
    const truthyOrFalsy = activity_columns.map(col => col.includes('p'));
    const new_activity_columns = activity_columns.map((col, i) => !truthyOrFalsy[i] ? 'p' + col : col);
    mol_data = mol_data
      .filter(lig => activity_columns.every(col => {
        const val = lig[col];
        return val != null && isFinite(val) && val > 0;
      }))
      .map(lig => {
        const out = { ...lig };
        new_activity_columns.forEach((col, j) => {
          out[col] = !truthyOrFalsy[j]
            ? -1 * Math.log10(lig[activity_columns[j]] * 10e-9)
            : lig[activity_columns[j]];
        });
        return out;
      });
    activity_columns = new_activity_columns;
  }

  if (settings.dedup) {
    mol_data = mol_data.filter((lig, idx, self) =>
      idx === self.findIndex(t => t.id === lig.id && t.canonical_smiles === lig.canonical_smiles)
    );
  }

  const clean = await generateFingerprints(mol_data, settings, RDKitInstance, requestId);
  notify({ id: requestId, function: 'fingerprint', data: clean, activity_columns, settings });
  notify({ id: requestId, message: 'Processing Done' });
}

async function makeFingerprints(params, requestId) {
  const RDKitInstance = await loadRDKit();
  const settings = params.formStuff ?? { fingerprint: 'maccs', radius: 2, nBits: 1024 };
  const processed = await generateFingerprints(params.mol_data, settings, RDKitInstance, requestId);
  notify({ id: requestId, function: 'only_fingerprint', results: processed });
  notify({ id: requestId, message: 'Processing Done' });
}

// FIX: The original code leaked every RDKit object created inside the MMA
// fragment loop. Rewrite ensures:
//  • mol_frags.cores / .sidechains are always deleted (even on throw).
//  • Each fragment mol produced by molList iteration is deleted after use.
//  • The inner MolList returned by get_frags() is deleted after iteration.
//  • The outer mol is deleted in the outer finally.
function scaffoldArrayGetter(row_list_s, activity_columns, requestId) {
  const curr_activity_column = row_list_s.map(obj => obj[activity_columns[0]]);
  const massive_array = [];

  loadRDKit().then(RDKit => {
    for (let i = 0; i < row_list_s.length; i++) {
      const x = row_list_s[i];
      let mol;
      try {
        mol = RDKit.get_mol(x.canonical_smiles);
        const mol_frags = mol.get_mmpa_frags(1, 1, 20);
        try {
          const sidechains_smiles_list = [];
          const cores_smiles_list = [];

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
                massive_array.push([x.canonical_smiles, fragments[0], fragments[1], x.id, x[activity_columns[0]]]);
              }
            } catch (e) {
              console.warn(`MMA frag error for ${x.canonical_smiles}:`, e?.message || e);
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
  }).catch(e => notifyError(requestId, 'mma', e));
}

function processScaffoldResults(curr_activity_column, massive_array, requestId) {
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
    .filter(([key, count]) => typeof count[0] === 'number' && count[0] >= 2 && key.length > 9)
    .map(x => [x[0], [x[1][0], ksTest(x[1][1], curr_activity_column)]]);
  scaffoldArray.sort((a, b) => a[1][1] - b[1][1]);
  notify({ id: requestId, function: 'mma', data: [scaffoldArray, massive_array] });
}

// KS Test
function ksStatistic(obsOne, obsTwo) {
  const cdfOne = obsOne.slice().sort((a, b) => a - b);
  const cdfTwo = obsTwo.slice().sort((a, b) => a - b);
  let i = 0, j = 0, d = 0, fn1 = 0, fn2 = 0;
  while (i < cdfOne.length && j < cdfTwo.length) {
    const d1 = cdfOne[i], d2 = cdfTwo[j];
    if (d1 <= d2) { i++; fn1 = i / cdfOne.length; }
    if (d2 <= d1) { j++; fn2 = j / cdfTwo.length; }
    d = Math.max(d, Math.abs(fn2 - fn1));
  }
  return d;
}

function ksSignificance(alam) {
  let fac = 2, sum = 0, termBf = 0;
  const a2 = -2 * alam * alam;
  for (let j = 1; j <= 100; j++) {
    const term = fac * Math.exp(a2 * j * j);
    sum += term;
    if (Math.abs(term) <= 0.001 * termBf || Math.abs(term) <= 1e-8 * sum) return sum;
    fac = -fac;
    termBf = Math.abs(term);
  }
  return 1.0;
}

function ksTest(obsOne, obsTwo) {
  const en = Math.sqrt((obsOne.length * obsTwo.length) / (obsOne.length + obsTwo.length));
  return ksSignificance(en + 0.12 + 0.11 / en);
}

// FIX: mol was only deleted inside the catch block — leaked on the success path.
// Moved safeDelete(mol) into a finally so it always runs.
async function tanimoto_gen(params, requestId) {
  self.importScripts('https://unpkg.com/mathjs@15.1.0/lib/browser/math.js');
  const RDKitInstance = await loadRDKit();
  let mol;
  try {
    mol = RDKitInstance.get_mol(params.anchorMol);
  } catch (e) {
    notify({ id: requestId, function: 'tanimoto', error: `Invalid anchor molecule: ${e?.message || e}` });
    return;
  }

  let molFP;
  const { fp_dets } = params;
  try {
    if (fp_dets.type === 'maccs') {
      molFP = mol.get_maccs_fp();
    } else if (fp_dets.type === 'morgan') {
      molFP = mol.get_morgan_fp(JSON.stringify({ radius: fp_dets.path, nBits: fp_dets.nBits }));
    } else if (fp_dets.type === 'rdkit_fp') {
      molFP = mol.get_rdkit_fp(JSON.stringify({ minPath: fp_dets.path, nBits: fp_dets.nBits }));
    } else {
      throw new Error(`Invalid fingerprint type: ${fp_dets.type}`);
    }
  } catch (e) {
    notify({ id: requestId, function: 'tanimoto', error: e?.message || e });
    return;
  } finally {
    // FIX: previously only deleted inside the catch — leaked on success path.
    safeDelete(mol);
  }

  const mol_fp_bit = bitStringToBitVector(molFP);
  const { mol_data } = params;
  for (let i = 0; i < mol_data.length; i++) {
    mol_data[i][`${params.anchorMol}_tanimoto`] = TanimotoSimilarity(mol_fp_bit, mol_data[i].fingerprint);
    notify({ message: `Progress: ${Math.round((i / mol_data.length) * 100)}%`, id: requestId });
  }
  notify({ id: requestId, function: 'tanimoto', data: mol_data });
}

function TanimotoSimilarity(v1, v2) {
  const numer = math.dot(v1, v2);
  if (numer === 0) return 0;
  const denom = math.number(math.square(math.norm(v1, 2))) +
    math.number(math.square(math.norm(v2, 2))) - numer;
  return denom === 0 ? 0 : numer / denom;
}

// FIX: query mol was not deleted when an error was thrown mid-loop — wrapped
// the loop body in try/finally so query is always freed after the loop.
async function substructure_search(params, requestId) {
  const { ligand, searchSmi } = params;
  const RDKitInstance = await loadRDKit();
  let query;
  try {
    query = RDKitInstance.get_mol(searchSmi);
  } catch (e) {
    notify({ id: requestId, function: 'substructure_search', error: `Invalid query SMILES: ${e?.message || e}` });
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
        console.warn(`Substructure skip ${lig.canonical_smiles}:`, e?.message || e);
      } finally {
        safeDelete(mol);
      }
    }
  } finally {
    safeDelete(query);
  }
  notify({ id: requestId, function: 'substructure_search', results: searchResults });
}

async function scaffold_network(params, requestId) {
  const RDKitInstance = await loadRDKit();
  try {
    const network_graphs = scaffold_net_chunking_method(params.smiles_list, 600, RDKitInstance, params);
    const image_graph = graph_molecule_image_generator(RDKitInstance, network_graphs);
    notify({ message: 'Scaffold Network Ready', id: requestId });
    notify({ id: requestId, function: 'scaffold_network', data: image_graph });
  } catch (e) {
    notify({ id: requestId, function: 'scaffold_network', error: e?.message || e });
  }
}

function colorOfEdge(edge) {
  const colors = { Fragment: '#99ccff', Generic: '#ff9999', GenericBond: '#99ff99', RemoveAttachment: '#666666' };
  return colors[edge] ?? '#cccc66';
}

// FIX: smiles_mol_list was only deleted inside the catch — leaked on every
// successful chunk. scaffold_net_ins was never deleted at all. Both are now
// freed in finally blocks.
function scaffold_net_chunking_method(array, chunkSize, rdkit, params) {
  const scaffold_net_ins = new rdkit.ScaffoldNetwork();
  scaffold_net_ins.set_scaffold_params(JSON.stringify(params));
  let network;

  try {
    for (let i = 0; i < array.length; i += chunkSize) {
      const smiles_mol_list = molListFromSmiArray(array.slice(i, i + chunkSize), rdkit);
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
        id: i.toString(), smiles: smiles_string,
        molCounts: network.molCounts.get(i),
        nodeType: array.includes(smiles_string) ? 'whole' : 'fragment',
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
        id: i.toString(), source: edge.beginIdx.toString(),
        target: edge.endIdx.toString(), label: edge.type, color: colorOfEdge(edge.type),
      });
    } catch (e) {
      console.warn(`Scaffold edge ${i} error:`, e?.message || e);
    }
  }
  return { nodes, edges };
}

// FIX: mol was not deleted when get_svg threw — now always freed in finally.
function graph_molecule_image_generator(rdkit, graphData, svgSize = 120) {
  for (const node of graphData.nodes) {
    let mol;
    try {
      mol = rdkit.get_mol(node.smiles);
      const svg = mol.get_svg(svgSize, svgSize);
      node.image = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
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
async function scoreSmilesBatch(smilesArray, modelKind = 'regression', fpSettings = {}) {
  const { fingerprint = 'maccs', fpRadius = 2, fpNBits = 1024 } = fpSettings;
  const RDKitInstance = await loadRDKit();
  const fps = [];

  for (const smi of smilesArray) {
    let mol;
    try {
      mol = RDKitInstance.get_mol(smi);
      if (!mol?.is_valid()) throw new Error('Invalid molecule');

      let fpBitString;
      if (fingerprint === 'maccs') fpBitString = mol.get_maccs_fp();
      else if (fingerprint === 'morgan') fpBitString = mol.get_morgan_fp(JSON.stringify({ radius: fpRadius, nBits: fpNBits }));
      else if (fingerprint === 'rdkit_fp') fpBitString = mol.get_rdkit_fp(JSON.stringify({ minPath: fpRadius, nBits: fpNBits }));
      else throw new Error(`Unknown fingerprint type: ${fingerprint}`);

      fps.push(bitStringToBitVector(fpBitString));
    } catch (e) {
      console.warn(`scoreSmilesBatch: skipping "${smi}": ${e?.message || e}`);
      fps.push(null);
    } finally {
      safeDelete(mol);
    }
  }

  const validFps = fps
    .filter(Boolean)
    .map(fp => new Float32Array(fp));
  if (validFps.length === 0) throw new Error('No valid fingerprints generated for scoring');

  try {
    const optsMap = { regression: 1, classification: 2 };
    const optsNum = optsMap[modelKind] ?? 1;
    return await callPyodide({ func: 'score_batch', fp: validFps, params: { model: optsNum } });
  } catch (e) {
    throw new Error(`Pyodide scoring failed: ${e?.message || e}`);
  }
}

async function mutateBatch(smilesArray) {
  const RDKitInstance = await loadRDKit();
  const offspring = [];

  for (const smi of smilesArray) {
    let mol;
    try {
      mol = RDKitInstance.get_mol(smi);
      if (!mol?.is_valid()) throw new Error('Invalid molecule');

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
                if (newMol?.is_valid() && newMol.get_num_atoms() <= 80 && !newSmi.includes('.')) {
                  mutated = newSmi;
                  success = true;
                }
              }
            } catch (e) {
              console.warn(`Product processing failed: ${e?.message || e}`);
            } finally {
              // Always drain every prodList — never break early
              safeDelete(newMol, prodMol, prodList);
            }
          }
        } catch (e) {
          console.warn(`Mutation attempt ${attempt + 1} failed for "${smi}": ${e?.message || e}`);
        } finally {
          safeDelete(products, molList, rxn);
        }
      }

      offspring.push(mutated);
    } catch (e) {
      console.warn(`mutateBatch: keeping original for "${smi}": ${e?.message || e}`);
      offspring.push(smi);
    } finally {
      safeDelete(mol);
    }
  }

  return offspring;
}

async function runGA(params) {
  try {
    const {
      zincSmiles, populationSize = 5, offspringSize = 5,
      maxGenerations = 50, modelKind = 'regression',
      fingerprint = 'maccs', fpRadius = 2, fpNBits = 1024, id,
    } = params;

    if (!zincSmiles || zincSmiles.length < populationSize) {
      throw new Error(`Not enough seed SMILES: need ${populationSize}, got ${zincSmiles?.length ?? 0}`);
    }

    gaCancelled = false;
    const fpSettings = { fingerprint, fpRadius, fpNBits };
    let population = zincSmiles.slice(0, populationSize);

    let scores;
    try {
      scores = await scoreSmilesBatch(population, modelKind, fpSettings);
    } catch (e) {
      throw new Error(`GA init scoring failed: ${e?.message || e}`);
    }

    for (let gen = 0; gen < maxGenerations; gen++) {
      try {
        if (gaCancelled) {
          notify({ id, type: 'ga_cancelled', gen });
          return null;
        }

        const ranked = population
          .map((smi, i) => ({ smi, score: scores[i] }))
          .sort((a, b) => b.score - a.score);

        const topK = Math.max(1, Math.min(Math.floor(populationSize * 0.2), ranked.length));
        const parents = Array.from({ length: offspringSize }, () => ranked[Math.floor(Math.random() * topK)].smi);

        let offspring, offspringScores;
        try {
          offspring = await mutateBatch(parents);
        } catch (e) {
          throw new Error(`Generation ${gen} mutation failed: ${e?.message || e}`);
        }

        try {
          offspringScores = await scoreSmilesBatch(offspring, modelKind, fpSettings);
        } catch (e) {
          throw new Error(`Generation ${gen} scoring failed: ${e?.message || e}`);
        }

        const allScores = [...scores, ...offspringScores];
        const poolRanked = [...population, ...offspring]
          .map((smi, i) => ({ smi, score: allScores[i] }))
          .sort((a, b) => b.score - a.score)
          .slice(0, populationSize);

        population = poolRanked.map(x => x.smi);
        scores = poolRanked.map(x => x.score);

        notify({ type: 'ga_progress', gen, best: scores[0], bestSmiles: population[0], id });
      } catch (e) {
        console.error(`Generation ${gen} error: ${e?.message || e}`);
        throw e;
      }
    }

    return { population, scores };
  } catch (e) {
    console.error(`runGA failed: ${e?.message || e}`);
    throw e;
  }
}

// ============================
// Message handler
// ============================
self.onmessage = async (event) => {
  const { function: funcName, id, ...params } = event.data;

  // Cancellation — no async needed
  if (funcName === 'cancel_ga') {
    gaCancelled = true;
    notify({ id, ok: true, type: 'ga_cancelled' });
    return;
  }

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

      case 'run_ga': {
        const result = await runGA({ ...params, id });
        if (result) notify({ id, ok: true, type: 'ga_complete', result });
        break;
      }

      case 'score_batch': {
        const scores = await scoreSmilesBatch(params.smiles, params.modelKind);
        notify({ id, ok: true, result: scores });
        break;
      }

      default:
        throw new Error(`Unknown function: "${funcName}"`);
    }
  } catch (error) {
    notifyError(id, funcName ?? 'unknown', error);
  }
};