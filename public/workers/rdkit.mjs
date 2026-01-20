console.log('Data Processing Worker Activated');

const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;

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
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }
  } catch (error) {
    notify({ id, error: error.message });
  }
};

function notify(message) {
  self.postMessage(message);
}

async function loadRDKit() {
  self.importScripts('/rdkit/RDKit_minimal.js');
  const RDKitInstance = await initRDKitModule({
    locateFile: (filename) => rdkitWasmUrl
  });
  notify({ message: RDKitInstance.version() + ' Loaded' });
  return RDKitInstance;
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
      if (!isEmpty(substructRes)) {
        searchResults.push(lig);
      }
      mol.delete();
    }
    query.delete();
    
    notify({ id: requestId, function: 'substructure_search', results: searchResults });
  } catch (e) {
    notify({ id: requestId, function: 'substructure_search', error: e.message });
  }
}

async function makeFingerprints(params, requestId) {
  const RDKitInstance = await loadRDKit();
  const settings = params.formStuff ?? {
    fingerprint: "maccs",
    radius: 2,
    nBits: 1024,
  };
  
  const processes_data = generateFingerprints(params.mol_data, settings, RDKitInstance, requestId);
  notify({ id: requestId, function: 'only_fingerprint', results: processes_data });
  notify({ id: requestId, message: 'Processing Done' });
}

async function processFingerprintData(params, requestId) {
  const RDKitInstance = await loadRDKit();
  const settings = params.formStuff ?? {
    fingerprint: "maccs",
    radius: 2,
    nBits: 1024,
    dedup: true,
    log10: true
  };

  let mol_data = params.mol_data;
  let activity_columns = params.activity_columns;
  let temp_ligand_process = mol_data;

  // Log10 conversion
  if (settings.log10) {
    const truthyOrFalsy = activity_columns.map(col => col.includes("p"));
    const new_activity_columns = activity_columns.map((col, index) =>
      !truthyOrFalsy[index] ? "p" + col : col
    );

    temp_ligand_process = mol_data.map((lig) => {
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

  // Deduplication
  if (settings.dedup) {
    temp_ligand_process = temp_ligand_process.filter((ligand, index, self) =>
      index === self.findIndex((t) => (
        t.id === ligand.id &&
        t.canonical_smiles === ligand.canonical_smiles
      ))
    );
  }

  const new_clean_ligand_data = generateFingerprints(temp_ligand_process, settings, RDKitInstance, requestId);

  notify({ 
    id: requestId, 
    function: 'fingerprint',
    data: new_clean_ligand_data,
    activity_columns: activity_columns,
    settings: settings 
  });
  notify({ id: requestId, message: 'Processing Done' });
}

function generateFingerprints(ligandData, settings, RDKitInstance, requestId) {
  const fpTypeMap = {
    'maccs': 'MACCS',
    'morgan': 'Morgan',
    'rdkit_fp': 'RDK'
  };

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
        x['fingerprint'] = bitStringToBitVector(
          mol.get_morgan_fp(JSON.stringify({ radius: path, nBits: nBits }))
        );
      } else if (fpType === 'RDK') {
        x['fingerprint'] = bitStringToBitVector(
          mol.get_rdkit_fp(JSON.stringify({ minPath: path, nBits: nBits }))
        );
      } else {
        throw new Error('Invalid fingerprint type');
      }

      mol.delete();
      new_clean_ligand_data.push(x);
      notify({ id: requestId, message: `Progress: ${Math.round((idx / ligand_data_len) * 100)}%` });
    } catch (e) {
      console.error(e);
    }
  });

  return new_clean_ligand_data;
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
            massive_array.push([
              x.canonical_smiles,
              fragments[0],
              fragments[1],
              x.id,
              x[activity_columns[0]],
            ]);
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

      if (!countArray[secondElement]) {
        countArray[secondElement] = [0, []];
      }

      countArray[secondElement][0]++;
      countArray[secondElement][1].push(fifthElement);
    }
  }

  let scaffoldArray = Object.entries(countArray);
  let filteredArrayOfScaffolds = scaffoldArray.filter(
    ([key, count]) => typeof count[0] === "number" && count[0] >= 2 && key.length > 9,
  );

  filteredArrayOfScaffolds = filteredArrayOfScaffolds.map((x) => {
    return [x[0], [x[1][0], ksTest(x[1][1], curr_activity_column)]];
  });

  filteredArrayOfScaffolds.sort((a, b) => a[1][1] - b[1][1]);
  notify({
    id: requestId,
    function: 'mma',
    data: [filteredArrayOfScaffolds, massive_array],
  });
}

function ksStatistic(obsOne, obsTwo) {
  const cdfOne = obsOne.slice().sort((a, b) => a - b);
  const cdfTwo = obsTwo.slice().sort((a, b) => a - b);

  let i = 0, j = 0, d = 0.0, fn1 = 0.0, fn2 = 0.0;
  const l1 = cdfOne.length;
  const l2 = cdfTwo.length;

  while (i < l1 && j < l2) {
    const d1 = cdfOne[i];
    const d2 = cdfTwo[j];

    if (d1 <= d2) {
      i++;
      fn1 = i / l1;
    }

    if (d2 <= d1) {
      j++;
      fn2 = j / l2;
    }

    const dist = Math.abs(fn2 - fn1);
    if (dist > d) {
      d = dist;
    }
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

    if (Math.abs(term) <= EPS1 * termBf || Math.abs(term) <= EPS2 * sum) {
      return sum;
    }

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
