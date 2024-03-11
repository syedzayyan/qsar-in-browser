"use client";

import { useState, useEffect, useRef, useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import RDKitContext from "../../../context/RDKitContext";
import TanimotoSimilarity from "../../../components/utils/tanimoto";
import fpSorter from "../../../components/utils/fp_sorter";
import ErrorContext from "../../../context/ErrorContext";

export default function Tanimoto() {
  const { ligand } = useContext(LigandContext);
  const { rdkit } = useContext(RDKitContext);
  const { setErrors } = useContext(ErrorContext);

  const containerRef = useRef(null);
  const [taniData, setTaniData] = useState([]);
  const [anchorMol, setAnchorMol] = useState("CCO");

  function tanimotoDist() {
    try {
      const mol_fp = fpSorter(
        localStorage.getItem("fingerprint"),
        anchorMol,
        rdkit,
        parseInt(localStorage.getItem("path")),
        parseInt(localStorage.getItem("nBits")),
      );
      const data = ligand.map((x) => {
        const tanimoto = TanimotoSimilarity(x.fingerprint, mol_fp);
        return tanimoto;
      });
      setTaniData(data);
    } catch (e) {
      console.error(e);
      setErrors("Most probably there is problem with your SMILES string");
    }
  }

  useEffect(() => {
    tanimotoDist();
  }, []);

  return (
    <div className="tools-container" ref={containerRef}>
      <details open={false}>
        <summary>What does this mean?</summary>
        <p>
          Tanimoto indexes are a similarity score between two molecules. The
          index is between 0 and 1 where a value closer to one indicated two
          molecules are very similar. If we have a reference molecule, which in
          this case is a random molecule, we could compare this molecule, to all
          the molecule in your database. This will help us understand, the
          diversity of our database, compared to a reference. This is still not
          the full picture, but adds a piece to the puzzle.
        </p>
      </details>
      <label>SMILES string</label>
      <input
        defaultValue={anchorMol}
        type="text"
        className="input"
        onChange={(e) => setAnchorMol(e.target.value)}
      />
      <button className="button" onClick={tanimotoDist}>
        Generate Graph
      </button>
      {taniData.length != 0 && (
        <>
          <Histogram
            data={taniData}
            toolTipData={ligand}
            xLabel="Tanimoto Scores"
            yLabel="Count"
          />
        </>
      )}
    </div>
  );
}
