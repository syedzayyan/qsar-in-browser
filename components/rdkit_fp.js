import { useContext, useEffect, useState } from "react";
import LigandContext from "../context/LigandContext";

import { PCA } from 'ml-pca';

import { initRDKit } from './utils/rdkit_loader'

export default function FPGen() {
  const { ligand } = useContext(LigandContext);

  const [rdload, setRDload] = useState(false);
  const [rdkitting, updateRdkitting] = useState(null);
  const [progress, setProgress] = useState(0);
  const totalCompounds = ligand.length;

  useEffect(() => {
    const processCompounds = async () => {
      try {
        const RDKit = await initRDKit();
        updateRdkitting(RDKit);

        const fp_storer = [];

        for (let i = 0; i < totalCompounds; i++) {
          try {
            const mol = rdkitting.get_mol(ligand[i].canonical_smiles);
            const mol_fp = mol.get_morgan_fp_as_uint8array(JSON.stringify({ radius: 2, nBits: 2048 }));
            fp_storer.push(mol_fp);
            console.log(mol_fp)
            const newProgress = ((i + 1) / totalCompounds) * 100;
            setProgress(newProgress);
          } catch {
            console.error('Error processing compound');
          }
        }

        try {
          const pca = new PCA(fp_storer);
          console.log(pca.predict(fp_storer, { nComponents: 2 }));
        } catch (error) {
          console.error("Error:", error);
        }

        setRDload(true);
      } catch {
        console.log('Do Something About RDKit');
      }
    };

    processCompounds();
  }, [ligand, totalCompounds]);

  if (rdload) {
    return (
      <>
        <div>Number of Data Points Processed: {totalCompounds}</div>
        <progress className="progress-bar" value={progress} max={100}></progress>
      </>
    );
  }

  return <>Processing...</>;
}
