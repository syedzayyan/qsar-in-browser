console.log('Data Processing Worker Activated');

const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;

function bitStringToBitVector(bitString) {
  let bitVector = [];
  for (let i = 0; i < bitString.length; i++) {
    bitVector.push(parseFloat(bitString[i]));
  }
  return bitVector;
}

self.onmessage = async (event) => {
  const { function: funcName, id, ...params } = event.data;

  // Route to appropriate function
  if (funcName === 'fingerprint') {
    await processFingerprintData(params, id);
  } else if (funcName === 'mma') {
    scaffoldArrayGetter(params.mol_data, params.activity_columns, id);
  } else if (funcName === 'fp_only') {
    await single_fingerprint(params, id);
  }
  else {
    self.postMessage({
      function: funcName,
      id: id,
      error: 'Unknown function'
    });
  }
};

async function processFingerprintData(params, requestId) {
  console.log('Processing Fingerprint Data');
  try {
    self.importScripts('/rdkit/RDKit_minimal.js');

    initRDKitModule({
      locateFile: (filename) => rdkitWasmUrl
    }).then((RDKitInstance) => {
      self.postMessage(RDKitInstance.version() + ' Loaded');

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
        const truthyOrFalsy = activity_columns.map((col) => col.includes("p"));
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

      // Fingerprint generation
      const fpTypeMap = {
        'maccs': 'MACCS',
        'morgan': 'Morgan',
        'rdkit_fp': 'RDK'
      };

      const fpType = fpTypeMap[settings.fingerprint];
      const path = settings.radius;
      const nBits = settings.nBits;
      const ligand_data_len = temp_ligand_process.length;
      const new_clean_ligand_data = [];

      temp_ligand_process.forEach((x, idx) => {
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
          self.postMessage(`Progress: ${Math.round((idx / ligand_data_len) * 100)}%`);
        } catch (e) {
          console.error(e);
        }
      });

      self.postMessage({
        function: 'fingerprint',
        id: requestId,
        data: new_clean_ligand_data,
        activity_columns: activity_columns,
        settings: settings
      });
      self.postMessage('Processing Done');
    });
  } catch (e) {
    console.error(e);
    self.postMessage({
      function: 'fingerprint',
      id: requestId,
      error: e.message
    });
  }
}

function scaffoldArrayGetter(row_list_s, activity_columns, requestId) {
  let curr_activity_column = row_list_s.map((obj) => obj[activity_columns[0]]);
  let massive_array = [];
  try {
    self.importScripts('/rdkit/RDKit_minimal.js');

    initRDKitModule({
      locateFile: (filename) => rdkitWasmUrl
    }).then((RDKit) => {
      row_list_s.map((x, i) => {
        const mol = RDKit.get_mol(x.canonical_smiles);
        let sidechains_smiles_list = [];
        let cores_smiles_list = [];
        try {
          const mol_frags = mol.get_mmpa_frags(1, 1, 20);
          while (!mol_frags.sidechains.at_end()) {
            var m = mol_frags.sidechains.next();
            var { molList, _ } = m.get_frags();
            try {
              let fragments = [];
              while (!molList.at_end()) {
                var m_frag = molList.next();
                fragments.push(m_frag.get_smiles());
                m_frag.delete();
              }
              cores_smiles_list.push(fragments.at(0));
              sidechains_smiles_list.push(fragments.at(1));
              massive_array.push([
                x.canonical_smiles,
                fragments.at(0),
                fragments.at(1),
                x.id,
                x[activity_columns[0]],
              ]);
              molList.delete();
              m.delete();
              mol_frags.cores.delete();
              mol_frags.sidechains.delete();
            } catch (e) {
              console.error(e);
            }
          }
        } catch (e) {
          // console.error("Problem: ", e);
        }
        row_list_s[i]["Cores"] = cores_smiles_list;
        row_list_s[i]["R_Groups"] = sidechains_smiles_list;
        mol.delete();
      });
    }).then(() => {


      let countArray = {};

      for (let i = 0; i < massive_array.length; i++) {
        if (massive_array[i].length >= 5) {
          // Ensure there are at least 5 elements in the subarray
          let secondElement = massive_array[i][1];
          let fifthElement = massive_array[i][4]; // Assuming the fifth element is at index 4

          if (!countArray[secondElement]) {
            countArray[secondElement] = [0, []];
          }

          countArray[secondElement][0]++;
          countArray[secondElement][1].push(fifthElement);
        }
      }

      let scaffoldArray = Object.entries(countArray);
      let filteredArrayOfScaffolds = scaffoldArray.filter(
        ([key, count]) =>
          typeof count[0] === "number" && count[0] >= 2 && key.length > 9,
      );

      filteredArrayOfScaffolds = filteredArrayOfScaffolds.map((x) => {
        return [x[0], [x[1][0], ksTest(x[1][1], curr_activity_column)]];
      });

      filteredArrayOfScaffolds.sort((a, b) => a[1][1] - b[1][1]);
      self.postMessage({
        function: 'mma',
        id: requestId,
        data: [filteredArrayOfScaffolds, massive_array],
      });



    })
  } catch (e) {
    console.error(e);
  }
}


function ksStatistic(obsOne, obsTwo) {
  const cdfOne = obsOne.slice().sort((a, b) => a - b);
  const cdfTwo = obsTwo.slice().sort((a, b) => a - b);

  let i = 0;
  let j = 0;
  let d = 0.0;
  let fn1 = 0.0;
  let fn2 = 0.0;
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

  return 1.0; // failing to converge
}

function ksTest(obsOne, obsTwo) {
  const d = ksStatistic(obsOne, obsTwo);
  const l1 = obsOne.length;
  const l2 = obsTwo.length;

  const en = Math.sqrt((l1 * l2) / (l1 + l2));
  return ksSignificance(en + 0.12 + 0.11 / en); // magic numbers
}


async function single_fingerprint(params, requestId) {
  console.log('Generating Single Fingerprint');
  try {
    self.importScripts('/rdkit/RDKit_minimal.js');

    initRDKitModule({
      locateFile: (filename) => rdkitWasmUrl
    }).then((RDKitInstance) => {
      self.postMessage(RDKitInstance.version() + ' Loaded');
    });
  } catch (e) {
    console.error(e);
    self.postMessage({
      function: 'fp_only',
      id: requestId,
      error: e.message
    });
  }
}






function fpSorter(fpType, smilesString, rdkit, path, nBits) {
  let mol;
  try {
    mol = rdkit.get_mol(smilesString);
  } catch {
    return null;
  }

  let molFP;
  if (fpType === "maccs") {
    molFP = mol.get_maccs_fp();
  } else if (fpType === "morgan") {
    molFP = mol.get_morgan_fp(JSON.stringify({ radius: path, nBits: nBits }));
  } else if (fpType === "rdkit_fp") {
    molFP = mol.get_rdkit_fp(JSON.stringify({ minPath: path, nBits: nBits }));
  } else {
    throw new Error("Error has happened")
  }
  mol.delete();
  return bitStringToBitVector(molFP);

}

function TanimotoSimilarity(v1, v2) {
  const numer = math.dot(v1, v2)
  if (numer === 0.0) {
    return 0.0;
  }
  const denom = math.number(math.square(math.norm(v1, 2))) + math.number(math.square(math.norm(v2, 2))) - numer;
  if (denom == 0.0) {
    return 0.0;
  }
  return numer / denom;
}

