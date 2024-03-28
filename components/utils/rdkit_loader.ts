import _ from "lodash";

export function molListFromSmiArray(smiArray, rdkit) {
  const molList = new rdkit.MolList();
  smiArray.forEach((smiName) => {
    const [smi, name] = smiName.split(" ");
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

export function scaffold_net_chunking_method(
  array: any[],
  chunkSize: number,
  rdkit,
  params
) {
  var scaffold_net_ins = new rdkit.ScaffoldNetwork();
  scaffold_net_ins.set_scaffold_params(JSON.stringify(params))
  let scaffold_net;
  for (let i = 0; i < array.length; i += chunkSize) {
    let smiles_mol_list;
    try {
      smiles_mol_list = molListFromSmiArray(
        array.slice(i, i + chunkSize),
        rdkit,
      );
      scaffold_net = scaffold_net_ins.update_scaffold_network(smiles_mol_list);
    } catch (e) {
      console.error(e);
    } finally {
      if (smiles_mol_list) {
        smiles_mol_list.delete();
      }
    }
  }
  return scaffold_net;
}

export const initRDKit = (() => {
  let rdkitLoadingPromise: Promise<any>;

  return (): Promise<any> => {
    if (!rdkitLoadingPromise) {
      rdkitLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/RDKit_minimal.js";
        script.async = true;
        document.body.appendChild(script);

        script.addEventListener("load", () => {
          globalThis
            .initRDKitModule()
            .then((RDKit) => {
              resolve(RDKit);
            })
            .catch((e) => {
              alert("RDKIT Cannot be Loaded");
            });
        });
      });
    }

    return rdkitLoadingPromise;
  };
})();
