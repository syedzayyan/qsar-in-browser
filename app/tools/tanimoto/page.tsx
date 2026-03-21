"use client";

import { useState, useEffect, useRef, useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import RDKitContext from "../../../context/RDKitContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import { Button, Select } from "@mantine/core";
import NotificationContext from "../../../context/NotificationContext";
import { readFpSettingsAsFpDets } from "../../../components/utils/get_fp_settings";

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
      function: "tanimoto",
      id: requestId,
      mol_data: ligand,
      anchorMol: anchorMol,
      fp_dets: readFpSettingsAsFpDets(),
      // { type: "morgan", path: 2, radius: 2, nBits: 2048, useChirality: false, … }
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
        <summary>How this histogram is generated</summary>
        <p>
          QITB calculates Tanimoto coefficients to represent the mathematical similarity
          between two molecular fingerprints. This histogram presents these
          coefficients for every molecule in the dataset, compared to the provided
          reference molecule. The default molecule provided is 'CCO' - ethanol, but
          you can draw any molecule or provide its SMILE string to use your own reference molecule.
        </p>
      </details>
      <details open={false}>
        <summary>How to interpret this graph</summary>
        <p>
          A maximum score of 1.0 represents high similarity between a given molecule and the
          provided reference molecule. A minimum score of 0.0 indicates low similarity between
          a given molecule and the reference molecule. Overall, a distribution close to 1.0
          represents a high similarity between the dataset and the reference molecule,
          while a distribution nearer 0 represents a low level of similarity between the
          reference molecule and the dataset. As Tanimoto coefficients are calculated from
          molecular fingerprints, this histogram changes dependent on the fingerprint chosen
          (MACCS, Morgan etc).
        </p>

      </details>
    </div>
  );
}
