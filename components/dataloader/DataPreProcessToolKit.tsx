import { useContext, useState } from "react";
import LigandContext from "../../context/LigandContext";
import bitStringToBitVector from '../utils/bit_vect'
import Loader from '../ui-comps/Loader';
import { useRouter } from 'next/navigation';
import RDKitContext from "../../context/RDKitContext";

export default function DataPreProcessToolKit() {
  const router = useRouter();
  const { ligand, setLigand } = useContext(LigandContext);
  const [dataDeduplication, setDataDeduplication] = useState(true);
  const [fingerprinting, setFingerprinting] = useState(true);
  const [pkistate, setpkistate] = useState(true);
  const [fpRadius, setFpRadius] = useState(2);
  const [fpSize, setFpSize] = useState(2048);

  const {rdkit} = useContext(RDKitContext)

  const [fpProcessing, setFPProcessing] = useState(false);
  const [fploading, setFPloading] = useState(false);

  function dataDeuplicater() {
    if (dataDeduplication) {
      let de_dup_lig = ligand.map(({ id, canonical_smiles, activity_column }) => {
        const newKey = 'pKi';
        const newValue = -Math.log10(activity_column * 10e-9).toFixed(2);
        return {
          id,
          canonical_smiles,
          activity_column,
          [newKey]: newValue,
        };
      }).filter((ligand, index, self) =>
        index === self.findIndex((t) => (
          t.id === ligand.id &&
          t.canonical_smiles === ligand.canonical_smiles &&
          ligand.activity_column
        )));


      if (fingerprinting) {
        de_dup_lig.forEach(async (lig, i) => {
          try {
            const mol = rdkit.get_mol(lig.canonical_smiles);
            let mol_fp = mol.get_morgan_fp(JSON.stringify({ radius: fpRadius, nBits: fpSize }));
            mol_fp = bitStringToBitVector(mol_fp)
            de_dup_lig[i]['fingerprint'] = mol_fp;
            mol?.delete();
          } catch (e) {
            console.error(e);
          }
          if (i === de_dup_lig.length - 1) {
            setLigand(de_dup_lig);
          }
        });
        setFPloading(false);
        router.push('/tools/activity');
      } else {
        setLigand(de_dup_lig);
      }
    }
  }



  if (fpProcessing) {
    return (
      <div>
        {fploading ? <Loader loadingText="Processing molecules and making them cooler"/> : <></>}
      </div>
    )
  } else {
    return (
      <div className="tools-container">
        <h2>Data Processing</h2>
        <hr></hr>
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
              onChange={(e) => setFpRadius(parseInt(e.target.value))}
            />
            <br></br>
            <label htmlFor="fp-size">Bit Size: </label>
            <input
              className="input"
              id='fp-size'
              type="number"
              value={fpSize}
              onChange={(e) => setFpSize(parseInt(e.target.value))}
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
          <p>Unfiltered Ligands: {ligand.length}</p>
      </div>
    )
  }
}
