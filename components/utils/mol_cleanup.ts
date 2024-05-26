import fpSorter from "./fp_sorter";

export default function molDataCleanUp(rdkit, mol_data, activity_columns, formStuff?){
  var formStuff = formStuff;
    if (formStuff === undefined) {
        formStuff = {
            fingerprint: "maccs",
            radius: 2,
            nBits: 1024,
            dedup: true,
            log10: true
        }
    }
    var temp_ligand_process = mol_data;
    var activity_columns = activity_columns;
    
    localStorage.setItem("fingerprint", formStuff.fingerprint);
    localStorage.setItem("path", formStuff.radius.toString());
    localStorage.setItem("nBits", formStuff.nBits.toString());

    if (formStuff.log10) {
      var new_activity_columns = activity_columns.map((col) => "p" + col);
        mol_data.map((lig, i) => {
          new_activity_columns.map((col, j) => {
              temp_ligand_process[i][col] = -1 * Math.log10(lig[activity_columns[j]] * 10e-9);
            })
        });
        activity_columns = new_activity_columns;
    }

    if (formStuff.dedup) {
        temp_ligand_process = temp_ligand_process.filter((ligand, index, self) =>
          index === self.findIndex((t) => (
            t.id === ligand.id &&
            t.canonical_smiles === ligand.canonical_smiles
          )));
    }

    temp_ligand_process.map((lig, i) => {
        try {
          const mol_fp = fpSorter(
            formStuff.fingerprint,
            lig.canonical_smiles,
            rdkit,
            formStuff.radius,
            formStuff.nBits
          )
          temp_ligand_process[i]['fingerprint'] = mol_fp;
        } catch (e) {
          console.error(e);
        }
      })
      return [temp_ligand_process, activity_columns];
}