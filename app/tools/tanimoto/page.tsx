"use client";

import { useState, useEffect, useRef, useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import RDKitContext from "../../../context/RDKitContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import { Button, Select } from "@mantine/core";
import NotificationContext from "../../../context/NotificationContext";

export default function Tanimoto() {
  const { ligand } = useContext(LigandContext) || { ligand: [] };
  const { rdkit } = useContext(RDKitContext);
  const [selectedAnchorMol, setSelectedAnchorMol] = useState<string | null>(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [taniData, setTaniData] = useState([]);
  const [anchorMol, setAnchorMol] = useState("CCO");

  const { notifications, pushNotification } = useContext(NotificationContext);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = anchorMol;
    }
  }, [anchorMol]);

  function tanimotoDist() {
    // Validate anchor molecule is not empty
    if (!anchorMol || anchorMol.trim() === "") {
      const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      pushNotification({
        message: "Error: Please provide a valid SMILES string for calculating Tanimoto Coefficient",
        id: errorId,
        done: true,
        duration: 5000,
      });
      return; // Exit early
    }

    const requestId = `fingerprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    pushNotification({
      message: "Generating Tanimoto Distances...",
      id: requestId,
      done: false,
      autoClose: false
    });
    
    rdkit.postMessage({
      function: 'tanimoto',
      id: requestId,
      mol_data: ligand,
      anchorMol: anchorMol,
      fp_dets: {
        type: localStorage.getItem("fingerprint") || "Morgan",
        radius: parseInt(localStorage.getItem("path")) || 2,
        nBits: parseInt(localStorage.getItem("nBits")) || 2048,
      }
    });
    
    setSelectedAnchorMol(anchorMol);
    setTaniData([...taniData, anchorMol]);
    setAnchorMol('');
  }

  const isRunning = notifications.some(
    notification => notification.id.startsWith("fingerprint_") && !notification.done
  );

  return (
    <div className="tools-container" ref={containerRef}>
      <h1>Similarity Distribution</h1> 
      
      <label>Reference Molecule (SMILES String) </label>
      <input
        defaultValue={anchorMol}
        type="text"
        className="input"
        onChange={(e) => setAnchorMol(e.target.value)}
        style={{ width: "40%" }}
        ref={inputRef}
      />
      &nbsp;
      <JSME width="400px" height="300px" onChange={(smiles) => setAnchorMol(smiles)} />
      &nbsp;
      <Button disabled={isRunning} className="button" onClick={tanimotoDist}>
        {isRunning ? "Generating Graph..." : "Generate Graph"}
      </Button>
      <Select
        label="Previously selected molecules"
        placeholder="Pick value"
        value={selectedAnchorMol}
        data={taniData}
        onChange={setSelectedAnchorMol}
      />
      {selectedAnchorMol &&
        Array.isArray(ligand) &&
        ligand.length > 0 &&
        ligand[0] &&
        ligand[0][`${selectedAnchorMol}_tanimoto`] !== undefined && (
          <Histogram
            data={ligand.map(mol => mol[`${selectedAnchorMol}_tanimoto`])}
            toolTipData={ligand}
            xLabel="Tanimoto Scores"
            yLabel="Count"
          />
        )}
      <details open={false}>
        <summary>How is this histogram generated?</summary>
        <p>
          QITB uses Tanimoto coefficients to represent mathematical similarity 
          between two molecular fingerprints. The histogram presents these 
          coefficients for every molecule in the dataset, compared to the provided 
          reference molecule. A maximum score of 1 represents high similarity, 
          while the minimum score of 0 indicates low similarity. Thus, a distribution 
          nearer 1 represents a high similarity between the dataset and the reference 
          molecule, while a distribution nearer 0 represents a low level of similarity 
          between the reference molecule and the dataset. 
        </p>
      </details>
    </div>
  );
}
