// unified_rdkit_worker.js
console.log('Unified RDKit Worker Activated');

const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;
let RDKitInstancePromise = null;

// Pyodide worker for ML scoring (GA only)
let pyodideWorker = null;
let pyodideJobId = 0;
const pyodideCallbacks = new Map();

// Unified utility functions
function bitStringToBitVector(bitString) {
  return bitString.split('').map(bit => parseFloat(bit));
}

function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
}

function notify(message) {
  self.postMessage(message);
}

// Unified RDKit loader
async function loadRDKit() {
  if (!RDKitInstancePromise) {
    RDKitInstancePromise = new Promise((resolve, reject) => {
      self.importScripts('/rdkit/RDKit_minimal.js');
      initRDKitModule({
        locateFile: (filename) => rdkitWasmUrl
      }).then(mod => {
        notify({ message: mod.version() + ' Loaded' });
        resolve(mod);
      }).catch(reject);
    });
  }
  return RDKitInstancePromise;
}

// Initialize Pyodide worker (lazy)
function initPyodideWorker() {
  if (!pyodideWorker) {
    pyodideWorker = new Worker('/workers/pyodide.mjs', { type: 'module' });
    pyodideWorker.onmessage = (event) => {
      const { id, ok, result, error } = event.data;
      const cb = pyodideCallbacks.get(id);
      if (!cb) return;
      pyodideCallbacks.delete(id);
      if (ok) cb.resolve(result);
      else cb.reject(new Error(error || 'Pyodide worker error'));
    };
  }
  return pyodideWorker;
}

function callPyodide(msg) {
  initPyodideWorker();
  return new Promise((resolve, reject) => {
    const id = ++pyodideJobId;
    pyodideCallbacks.set(id, { resolve, reject });
    pyodideWorker.postMessage({ id, ...msg });
  });
}

// GA-specific utilities (weighted choice, mutation templates)
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

// Unified mutation template generators (all GA mutations)
function deleteAtomTemplate() {
  const choices = ["[*:1]~[D1:2]>>[*:1]", "[*:1]~[D2:2]~[*:3]>>[*:1]-[*:3]",
    "[*:1]~[D3:2](~[*;!H0:3])~[*:4]>>[*:1]-[*:3]-[*:4]",
    "[*:1]~[D4:2](~[*;!H0:3])(~[*;!H0:4])~[*:5]>>[*:1]-[*:3]-[*:4]-[*:5]",
    "[*:1]~[D4:2](~[*;!H0;!H1:3])(~[*:4])~[*:5]>>[*:1]-[*:3](-[*:4])-[*:5]"];
  const p = [0.25, 0.25, 0.25, 0.1875, 0.0625];
  return weightedChoice(choices, p);
}

function appendAtomTemplate() {
  const choices = [
    { bo: "single", atoms: ["C", "N", "O", "F", "S", "Cl", "Br"], weights: Array(7).fill(1 / 7) },
    { bo: "double", atoms: ["C", "N", "O"], weights: Array(3).fill(1 / 3) },
    { bo: "triple", atoms: ["C", "N"], weights: [0.5, 0.5] },
  ];
  const pBO = [0.60, 0.35, 0.05];
  const choice = choices[weightedChoiceIndex(pBO)];
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
  const pBO = [0.60, 0.35, 0.05];
  const choice = choices[weightedChoiceIndex(pBO)];
  const newAtom = weightedChoice(choice.atoms, choice.weights);
  if (choice.bo === "single") return `[*:1]~[*:2]>>[*:1]${newAtom}[*:2]`;
  if (choice.bo === "double") return `[*;!H0:1]~[*:2]>>[*:1]=${newAtom}-[*:2]`;
  return `[*;!R;!H1;!H0:1]~[*:2]>>[*:1]#${newAtom}-[*:2]`;
}

function changeBondOrderTemplate() {
  const choices = ["[*:1]!-[*:2]>>[*:1]-[*:2]", "[*;!H0:1]-[*;!H0:2]>>[*:1]=[*:2]",
    "[*:1]#[*:2]>>[*:1]=[*:2]", "[*;!R;!H1;!H0:1]~[*:2]>>[*:1]#[*:2]"];
  const p = [0.45, 0.45, 0.05, 0.05];
  return weightedChoice(choices, p);
}

function deleteCyclicBondTemplate() {
  return "[*:1]@[*:2]>>([*:1].[*:2])";
}

function addRingTemplate() {
  const choices = [
    "[*;!r;!H0:1]~[*;!r:2]~[*;!r;!H0:3]>>[*:1]1~[*:2]~[*:3]1",
    "[*;!r;!H0:1]~[*!r:2]~[*!r:3]~[*;!r;!H0:4]>>[*:1]1~[*:2]~[*:3]~[*:4]1",
    "[*;!r;!H0:1]~[*!r:2]~[*:3]~[*:4]~[*;!r;!H0:5]>>[*:1]1~[*:2]~[*:3]~[*:4]~[*:5]1",
    "[*;!r;!H0:1]~[*!r:2]~[*:3]~[*:4]~[*!r:5]~[*;!r;!H0:6]>>[*:1]1~[*:2]~[*:3]~[*:4]~[*:5]~[*:6]1"
  ];
  const p = [0.05, 0.05, 0.45, 0.45];
  return weightedChoice(choices, p);
}

function changeAtomTemplate(smiles, RDKitInstance) {
  const choices = ["#6", "#7", "#8", "#9", "#16", "#17", "#35"];
  const p = [0.15, 0.15, 0.14, 0.14, 0.14, 0.14, 0.14];

  const mol = RDKitInstance.get_mol(smiles);
  let X = weightedChoice(choices, p);
  let loopCount = 0;

  // Use get_qmol for SMARTS queries, not get_mol
  while (loopCount < 100) {
    const qmol = RDKitInstance.get_qmol(`[${X}]`);
    const matches = mol.get_substruct_match(qmol);
    qmol.delete();
    if (matches && JSON.parse(matches).length > 0) break;
    X = weightedChoice(choices, p);
    loopCount++;
  }

  let Y = weightedChoice(choices, p);
  while (Y === X) Y = weightedChoice(choices, p);

  mol.delete();
  return `[${X}:1]>>[${Y}:1]`;
}

function generateMutationSmarts(smiles, RDKitInstance) {
  const idx = weightedChoiceIndex(MUTATION_TYPE_WEIGHTS);
  switch (idx) {
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

// Core processing functions (shared)
async function generateFingerprints(ligandData, settings, RDKitInstance, requestId) {
  const fpTypeMap = { 'maccs': 'MACCS', 'morgan': 'Morgan', 'rdkit_fp': 'RDK' };
  const fpType = fpTypeMap[settings.fingerprint];
  const path = settings.radius;
  const nBits = settings.nBits;
  const ligand_data_len = ligandData.length;
  const new_clean_ligand_data = [];

  ligandData.forEach((x, idx) => {
    let mol;
    try {
      mol = RDKitInstance.get_mol(x.canonical_smiles);
      if (fpType === 'MACCS') {
        x['fingerprint'] = bitStringToBitVector(mol.get_maccs_fp());
      } else if (fpType === 'Morgan') {
        x['fingerprint'] = bitStringToBitVector(mol.get_morgan_fp(JSON.stringify({ radius: path, nBits: nBits })));
      } else if (fpType === 'RDK') {
        x['fingerprint'] = bitStringToBitVector(mol.get_rdkit_fp(JSON.stringify({ minPath: path, nBits: nBits })));
      }
      mol.delete();
      new_clean_ligand_data.push(x);
      notify({ id: requestId, message: `Progress: ${Math.round((idx / ligand_data_len) * 100)}%` });
    } catch (e) {
      console.error(e);
      if (mol) mol.delete();
    }
  });
  return new_clean_ligand_data;
}

// Original functions (fingerprint, mma, tanimoto, etc.)
async function processFingerprintData(params, requestId) {
  const RDKitInstance = await loadRDKit();
  const settings = params.formStuff ?? { fingerprint: "maccs", radius: 2, nBits: 1024, dedup: true, log10: true };
  let mol_data = params.mol_data;
  let activity_columns = params.activity_columns;
  let temp_ligand_process = mol_data;

  if (settings.log10) {
    const truthyOrFalsy = activity_columns.map(col => col.includes("p"));
    const new_activity_columns = activity_columns.map((col, index) => !truthyOrFalsy[index] ? "p" + col : col);
    temp_ligand_process = temp_ligand_process.filter(lig =>
      activity_columns.every(col => {
        const val = lig[col];
        return val != null && isFinite(val) && val > 0;
      })
    );
    temp_ligand_process = temp_ligand_process.map((lig) => {
      const processedLig = { ...lig };
      new_activity_columns.forEach((col, j) => {
        if (!truthyOrFalsy[j]) {
          processedLig[col] = -1 * Math.log10(lig[activity_columns[j]] * 10e-9);
        } else {
          processedLig[col] = lig[activity_columns[j]];
        }
      });
      return processedLig;
    });
    activity_columns = new_activity_columns;
  }

  if (settings.dedup) {
    temp_ligand_process = temp_ligand_process.filter((ligand, index, self) =>
      index === self.findIndex((t) => t.id === ligand.id && t.canonical_smiles === ligand.canonical_smiles)
    );
  }

  const new_clean_ligand_data = await generateFingerprints(temp_ligand_process, settings, RDKitInstance, requestId);
  notify({ id: requestId, function: 'fingerprint', data: new_clean_ligand_data, activity_columns, settings });
  notify({ id: requestId, message: 'Processing Done' });
}

async function makeFingerprints(params, requestId) {
  const RDKitInstance = await loadRDKit();
  const settings = params.formStuff ?? { fingerprint: "maccs", radius: 2, nBits: 1024 };
  const processes_data = await generateFingerprints(params.mol_data, settings, RDKitInstance, requestId);
  notify({ id: requestId, function: 'only_fingerprint', results: processes_data });
  notify({ id: requestId, message: 'Processing Done' });
}

function scaffoldArrayGetter(row_list_s, activity_columns, requestId) {
  const curr_activity_column = row_list_s.map((obj) => obj[activity_columns[0]]);
  const massive_array = [];
  loadRDKit().then((RDKit) => {
    row_list_s.forEach((x, i) => {
      const mol = RDKit.get_mol(x.canonical_smiles);
      let sidechains_smiles_list = [];
      let cores_smiles_list = [];
      try {
        const mol_frags = mol.get_mmpa_frags(1, 1, 20);
        while (!mol_frags.sidechains.at_end()) {
          const m = mol_frags.sidechains.next();
          const { molList } = m.get_frags();
          try {
            let fragments = [];
            while (!molList.at_end()) {
              const m_frag = molList.next();
              fragments.push(m_frag.get_smiles());
              m_frag.delete();
            }
            cores_smiles_list.push(fragments[0]);
            sidechains_smiles_list.push(fragments[1]);
            massive_array.push([x.canonical_smiles, fragments[0], fragments[1], x.id, x[activity_columns[0]]]);
            molList.delete();
            m.delete();
          } catch (e) {
            console.error(e);
          }
        }
        mol_frags.cores.delete();
        mol_frags.sidechains.delete();
      } catch (e) {
        console.error(e);
      }
      row_list_s[i]["Cores"] = cores_smiles_list;
      row_list_s[i]["R_Groups"] = sidechains_smiles_list;
      mol.delete();
    });
    processScaffoldResults(curr_activity_column, massive_array, requestId);
  });
}

function processScaffoldResults(curr_activity_column, massive_array, requestId) {
  const countArray = {};
  for (const row of massive_array) {
    if (row.length >= 5) {
      const secondElement = row[1];
      const fifthElement = row[4];
      if (!countArray[secondElement]) countArray[secondElement] = [0, []];
      countArray[secondElement][0]++;
      countArray[secondElement][1].push(fifthElement);
    }
  }
  let scaffoldArray = Object.entries(countArray);
  let filteredArrayOfScaffolds = scaffoldArray.filter(([key, count]) =>
    typeof count[0] === "number" && count[0] >= 2 && key.length > 9
  );
  filteredArrayOfScaffolds = filteredArrayOfScaffolds.map((x) =>
    [x[0], [x[1][0], ksTest(x[1][1], curr_activity_column)]]
  );
  filteredArrayOfScaffolds.sort((a, b) => a[1][1] - b[1][1]);
  notify({ id: requestId, function: 'mma', data: [filteredArrayOfScaffolds, massive_array] });
}

// KS Test functions (MMA)
function ksStatistic(obsOne, obsTwo) {
  const cdfOne = obsOne.slice().sort((a, b) => a - b);
  const cdfTwo = obsTwo.slice().sort((a, b) => a - b);
  let i = 0, j = 0, d = 0.0, fn1 = 0.0, fn2 = 0.0;
  const l1 = cdfOne.length;
  const l2 = cdfTwo.length;
  while (i < l1 && j < l2) {
    const d1 = cdfOne[i];
    const d2 = cdfTwo[j];
    if (d1 <= d2) { i++; fn1 = i / l1; }
    if (d2 <= d1) { j++; fn2 = j / l2; }
    const dist = Math.abs(fn2 - fn1);
    if (dist > d) d = dist;
  }
  return d;
}

function ksSignificance(alam) {
  const EPS1 = 0.001;
  const EPS2 = 1.0e-8;
  let fac = 2.0;
  let sum = 0.0;
  let termBf = 0.0;
  const a2 = -2.0 * alam * alam;
  for (let j = 1; j <= 100; j++) {
    const term = fac * Math.exp(a2 * j * j);
    sum += term;
    if (Math.abs(term) <= EPS1 * termBf || Math.abs(term) <= EPS2 * sum) return sum;
    fac = -fac;
    termBf = Math.abs(term);
  }
  return 1.0;
}

function ksTest(obsOne, obsTwo) {
  const d = ksStatistic(obsOne, obsTwo);
  const l1 = obsOne.length;
  const l2 = obsTwo.length;
  const en = Math.sqrt((l1 * l2) / (l1 + l2));
  return ksSignificance(en + 0.12 + 0.11 / en);
}

async function tanimoto_gen(params, requestId) {
  self.importScripts('https://unpkg.com/mathjs@15.1.0/lib/browser/math.js');
  const RDKitInstance = await loadRDKit();
  let mol;
  try {
    mol = RDKitInstance.get_mol(params.anchorMol);
  } catch (e) {
    notify({ id: requestId, function: 'tanimoto', error: e.message });
    return;
  }
  let molFP;
  const fp_dets = params.fp_dets;
  if (fp_dets.type === "maccs") {
    molFP = mol.get_maccs_fp();
  } else if (fp_dets.type === "morgan") {
    molFP = mol.get_morgan_fp(JSON.stringify({ radius: fp_dets.path, nBits: fp_dets.nBits }));
  } else if (fp_dets.type === "rdkit_fp") {
    molFP = mol.get_rdkit_fp(JSON.stringify({ minPath: fp_dets.path, nBits: fp_dets.nBits }));
  } else {
    notify({ id: requestId, function: 'tanimoto', error: 'Invalid fingerprint type' });
    return;
  }
  mol.delete();
  const mol_fp_bit = bitStringToBitVector(molFP);
  const mol_data = params.mol_data;
  for (let i = 0; i < mol_data.length; i++) {
    const tanimoto_sim = TanimotoSimilarity(mol_fp_bit, mol_data[i].fingerprint);
    mol_data[i][`${params.anchorMol}_tanimoto`] = tanimoto_sim;
    notify({ message: `Progress: ${Math.round((i / mol_data.length) * 100)}%`, id: requestId });
  }
  notify({ id: requestId, function: 'tanimoto', data: mol_data });
}

function TanimotoSimilarity(v1, v2) {
  const numer = math.dot(v1, v2);
  if (numer === 0.0) return 0.0;
  const denom = math.number(math.square(math.norm(v1, 2))) +
    math.number(math.square(math.norm(v2, 2))) - numer;
  return denom === 0.0 ? 0.0 : numer / denom;
}

async function substructure_search(params, requestId) {
  const { ligand, searchSmi } = params;
  const RDKitInstance = await loadRDKit();
  try {
    const searchResults = [];
    const query = RDKitInstance.get_mol(searchSmi);
    for (const lig of ligand) {
      const mol = RDKitInstance.get_mol(lig.canonical_smiles);
      const substructRes = JSON.parse(mol.get_substruct_match(query));
      if (!isEmpty(substructRes)) searchResults.push(lig);
      mol.delete();
    }
    query.delete();
    notify({ id: requestId, function: 'substructure_search', results: searchResults });
  } catch (e) {
    notify({ id: requestId, function: 'substructure_search', error: e.message });
  }
}

async function scaffold_network(params, requestId) {
  try {
    const RDKitInstance = await loadRDKit();
    const network_graphs = scaffold_net_chunking_method(params.smiles_list, 600, RDKitInstance, params);
    const image_graph = graph_molecule_image_generator(RDKitInstance, network_graphs);
    notify({ message: `Scaffold Network Ready`, id: requestId });
    notify({ id: requestId, function: 'scaffold_network', data: image_graph });
  } catch (e) {
    notify({ id: requestId, function: 'scaffold_network', error: e.message });
  }
}

function colorOfEdge(edge) {
  if (edge === "Fragment") return "#99ccff";
  if (edge === "Generic") return "#ff9999";
  if (edge === "GenericBond") return "#99ff99";
  if (edge === "RemoveAttachment") return "#666666";
  return "#cccc66";
}

function molListFromSmiArray(smiArray, rdkit) {
  const molList = new rdkit.MolList();
  smiArray.forEach((smiName) => {
    const [smi] = smiName.split(" ");
    let mol;
    try {
      mol = rdkit.get_mol(smi);
      molList.append(mol);
    } finally {
      mol?.delete();
    }
  });
  return molList;
}

function scaffold_net_chunking_method(array, chunkSize, rdkit, params) {
  var scaffold_net_ins = new rdkit.ScaffoldNetwork();
  scaffold_net_ins.set_scaffold_params(JSON.stringify(params));
  let network;
  for (let i = 0; i < array.length; i += chunkSize) {
    let smiles_mol_list;
    try {
      smiles_mol_list = molListFromSmiArray(array.slice(i, i + chunkSize), rdkit);
      network = scaffold_net_ins.update_scaffold_network(smiles_mol_list);
    } catch (e) {
      console.error(e);
    } finally {
      smiles_mol_list?.delete();
    }
  }
  scaffold_net_ins?.delete();
  const nodes = [];
  for (let i = 0; i < network.nodes.size(); i++) {
    try {
      var smiles_string = network.nodes.get(i);
      nodes.push({
        id: i.toString(),
        smiles: smiles_string,
        molCounts: network.molCounts.get(i),
        nodeType: array.includes(smiles_string) ? "whole" : "fragment",
      });
    } catch (e) {
      console.error("Error in adding node: ", e);
    }
  }
  const edges = [];
  for (let i = 0; i < network.edges.size(); i++) {
    try {
      let network_edge = network.edges.get(i);
      edges.push({
        id: i.toString(),
        source: network_edge.beginIdx.toString(),
        target: network_edge.endIdx.toString(),
        label: network_edge.type,
        color: colorOfEdge(network_edge.type),
      });
    } catch (e) {
      console.error("Error in adding edge: ", e);
    }
  }
  return { nodes, edges };
}

function graph_molecule_image_generator(rdkit, graphData, svgSize = 120) {
  try {
    graphData.nodes.forEach((node) => {
      var mol = rdkit.get_mol(node.smiles);
      var svg_string = mol.get_svg(svgSize, svgSize);
      var blob_link = new Blob([svg_string], { type: "image/svg+xml" });
      node.image = URL.createObjectURL(blob_link);
      mol?.delete();
    });
  } catch (e) {
    console.error(e);
  }
  return graphData;
}

// GA-specific functions
async function scoreSmilesBatch(smilesArray, modelKind = 'regression', fpSettings = {}) {
  const { fingerprint = 'maccs', fpRadius = 2, fpNBits = 1024 } = fpSettings;
  const RDKitInstance = await loadRDKit();
  let fps = [];
  for (const smi of smilesArray) {
    const mol = RDKitInstance.get_mol(smi);
    if (!mol || !mol.is_valid()) { if (mol) mol.delete(); continue; }

    let fpBitString;
    if (fingerprint === 'maccs') {
      fpBitString = mol.get_maccs_fp();
    } else if (fingerprint === 'morgan') {
      fpBitString = mol.get_morgan_fp(JSON.stringify({ radius: fpRadius, nBits: fpNBits }));
    } else if (fingerprint === 'rdkit_fp') {
      fpBitString = mol.get_rdkit_fp(JSON.stringify({ minPath: fpRadius, nBits: fpNBits }));
    }

    fps.push(bitStringToBitVector(fpBitString));
    mol.delete();
  }
  return await callPyodide({ func: 'score_batch', fp: fps, params: { model: modelKind } });
}

async function mutateBatch(smilesArray) {
  const RDKitInstance = await loadRDKit();
  const offspring = [];
  for (const smi of smilesArray) {
    const mol = RDKitInstance.get_mol(smi);
    if (!mol || !mol.is_valid()) {
      if (mol) mol.delete();
      offspring.push(smi);
      continue;
    }
    let mutated = smi;
    let success = false;
    for (let attempt = 0; attempt < 10 && !success; attempt++) {
      try {
        const rxnSmarts = generateMutationSmarts(smi, RDKitInstance);
        const rxn = RDKitInstance.get_rxn(rxnSmarts);
        const molList = molListFromSmiArray([smi], RDKitInstance);
        const products = rxn.run_reactants(molList, 10);
        for (let i = 0; i < products.size(); i++) {
          const prodList = products.get(i);
          const prodMol = prodList.next();
          if (prodMol && prodMol.is_valid()) {
            const newSmi = prodMol.get_smiles();
            const newMol = RDKitInstance.get_mol(newSmi);
            if (newMol && newMol.is_valid() && newMol.get_num_atoms() <= 80 && !newSmi.includes('.')) {
              mutated = newSmi;
              success = true;
              newMol.delete();
              prodMol.delete();
              prodList.delete();
              break;
            }
            if (newMol) newMol.delete();
            if (prodMol) prodMol.delete();
          }
          prodList.delete();
        }
        products.delete();
        molList.delete();
        rxn.delete();
      } catch (e) {
        console.error(`Mutation attempt ${attempt + 1} failed for ${smi}:`, e);
      }

    }
    mol.delete();
    offspring.push(mutated);

  }
  return offspring;
}

async function runGA(params) {
  const { zincSmiles, populationSize = 5, offspringSize = 5,
    maxGenerations = 50, modelKind = 'regression',
    fingerprint = 'maccs', fpRadius = 2, fpNBits = 1024 } = params; if (!zincSmiles || zincSmiles.length < populationSize) {
      throw new Error('Not enough ZINC SMILES provided');
    }
  const fpSettings = { fingerprint, fpRadius, fpNBits };
  let population = zincSmiles.slice(0, populationSize);
  let scores = await scoreSmilesBatch(population, modelKind, fpSettings);
  for (let gen = 0; gen < maxGenerations; gen++) {
    const ranked = population.map((smi, i) => ({ smi, score: scores[i] })).sort((a, b) => b.score - a.score);
    const topK = Math.max(1, Math.min(
      Math.floor(populationSize * 0.2),
      ranked.length  // ← can't exceed actual population
    ));
    const parents = [];
    for (let i = 0; i < offspringSize; i++) {
      const idx = Math.floor(Math.random() * topK);
      parents.push(ranked[idx].smi);
    }
    const offspring = await mutateBatch(parents);
    const offspringScores = await scoreSmilesBatch(offspring, modelKind, fpSettings);
    const pool = [...population, ...offspring];
    const poolScores = [...scores, ...offspringScores];
    const pooledRanked = pool.map((smi, i) => ({ smi, score: poolScores[i] })).sort((a, b) => b.score - a.score);
    const newPop = pooledRanked.slice(0, populationSize);
    population = newPop.map(x => x.smi);
    scores = newPop.map(x => x.score);
    notify({ type: 'ga_progress', gen, best: scores[0], bestSmiles: population[0], id: params.id });
  }
  return { population, scores };
}

// Unified message handler
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
      case 'run_ga':
        const result = await runGA({ ...params, id });
        notify({ id, ok: true, result });
        break;
      case 'score_batch':
        const scores = await scoreSmilesBatch(params.smiles, params.modelKind);
        notify({ id, ok: true, result: scores });
        break;
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }
  } catch (error) {
    notify({ id, error: error.message });
  }
};
