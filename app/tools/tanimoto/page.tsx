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
    const requestId = `fingerprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    pushNotification({ message: "Generating Tanimoto Distances...", id: requestId, done: false });
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
  }

  const isRunning = notifications.some(notification => notification.id.startsWith("fingerprint_") && !notification.done);

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
      <label>SMILES string:  </label>
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
        label="Your favorite library"
        placeholder="Pick value"
        value = {selectedAnchorMol}
        data={taniData}
        onChange={setSelectedAnchorMol}
      />
      {
        selectedAnchorMol &&
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
        )
      }
    </div>
  );
}
