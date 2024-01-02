import { useContext, useEffect, useState } from "react";
import LigandContext from "../context/LigandContext";
import { initRDKit } from './utils/rdkit_loader'
import Link from "next/link";
import Loader from './Loader';
import { useRouter } from 'next/router';

export default function DataPreProcessToolKit() {
  const router = useRouter();
  const { ligand, setLigand } = useContext(LigandContext);
  const [dataDeduplication, setDataDeduplication] = useState(true);
  const [fingerprinting, setFingerprinting] = useState(true);
  const [pkistate, setpkistate] = useState(true);
  const [fpRadius, setFpRadius] = useState(2);
  const [fpSize, setFpSize] = useState(2048);

  const [RDKit, setRDKit] = useState(null);
  const [stateOfRDKit, setStateOfRDKit] = useState(false);

  const [fpProcessing, setFPProcessing] = useState(false);
  const [fploading, setFPloading] = useState(false);

  const [totalComps, setTotalComps] = useState(0);

  useEffect(() => {
    async function loadRDKit() {
      const RDK = await initRDKit()
      setRDKit(RDK);
      setStateOfRDKit(true);
    }
    loadRDKit();
  })

  function dataDeuplicater() {
    if (dataDeduplication) {
      let de_dup_lig = ligand.map(({ molecule_chembl_id, canonical_smiles, standard_value }) => {
        const newKey = 'pKi';
        const newValue = -Math.log10(standard_value * 10e-9);
        return {
          molecule_chembl_id,
          canonical_smiles,
          standard_value,
          [newKey]: newValue,
        };
      }).filter((ligand, index, self) =>
        index === self.findIndex((t) => (
          t.molecule_chembl_id === ligand.molecule_chembl_id &&
          t.canonical_smiles === ligand.canonical_smiles &&
          ligand.standard_value
        )));

      setTotalComps(de_dup_lig.length);

      if (fingerprinting) {
        de_dup_lig.forEach(async (lig, i) => {
          try {
            const mol = RDKit.get_mol(lig.canonical_smiles);
            const mol_fp = mol.get_morgan_fp_as_uint8array(JSON.stringify({ radius: fpRadius, nBits: fpSize }));
            de_dup_lig[i]['fingerprint'] = mol_fp;
            mol?.delete();
          } catch (e) {
            console.error(e);
          }

          // Use functional form of setFPProgress to ensure correct update

          if (i === de_dup_lig.length - 1) {
            // Update the state with the final ligand array
            setLigand(de_dup_lig);
          }
        });
        setFPloading(false);
        router.push('/tools/data-distribution');
      } else {
        // Update the state without fingerprinting
        setLigand(de_dup_lig);
      }
    }
  }



  if (fpProcessing) {
    return (
      <div>
        {fploading ? <Loader /> : <></>}
      </div>
    )
  } else {
    return (
      <div style={{ width: '100%' }}>
        <h2>Data Processing</h2>
        <hr></hr>
        {stateOfRDKit ? (<span>RDKit is Loaded ✅</span>) : (<span>Loading RDKit</span>)}
        <br></br>
        <input
          checked={dataDeduplication}
          type="checkbox"
          id='data-dedup-check'
          onChange={() => setDataDeduplication(!dataDeduplication)}
        />
        <label htmlFor="data-dedup-check">Data De-Duplication</label>
        <br></br>
        <input
          checked={fingerprinting}
          type="checkbox"
          id='fingerprint-check'
          onChange={() => setFingerprinting(!fingerprinting)}
        />
        <label htmlFor="fingerprint-check">Fingerprinting</label>
        <br></br>
        <input
          checked={pkistate}
          type="checkbox"
          id='pki-check'
          onChange={() => setpkistate(!pkistate)}
        />
        <label htmlFor="pki-check">Convert to pKi</label>

        <br></br><br></br>
        <details open={false}>
          <summary>Fingerprint Settings</summary>
          <label htmlFor="fp-radius">Radius: </label>
          <input
            className="input"
            id='fp-radius'
            type="number"
            value={fpRadius}
            onChange={(e) => setFpRadius(e.target.value)}
          />
          <br></br>
          <label htmlFor="fp-size">Bit Size: </label>
          <input
            className="input"
            id='fp-size'
            type="number"
            value={fpSize}
            onChange={(e) => setFpSize(e.target.value)}
          />
        </details>

        <br></br>
        <button className="button" onClick={() => {
          setFPProcessing(true);
          setFPloading(true)
          setTimeout(function () {
            dataDeuplicater();
          }, 500);
        }}>Pre-Process Data</button>
        <br></br>
        <p>Filtered Ligands: {totalComps}</p>
      </div>
    )
  }
}
