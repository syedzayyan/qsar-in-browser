"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Scatterplot from "../../../components/tools/toolViz/ScatterPlot";
import { usePathname } from "next/navigation";
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import TargetContext from "../../../context/TargetContext";
import { MLResultsContext } from "../../../context/MLResultsContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../components/tools/toolViz/DropDown";
import { Button, Group, Input, Select } from "@mantine/core";
import FoldMetricBarplot from "../../../components/tools/toolViz/BarChart";

export default function MLLayout({ children }) {
  const [screenData, setScreenData] = useState([]);
  const [oneOffSMILES, setOneOffSmiles] = useState("CCO");
  const [oneOffSMILESResult, setOneOffSmilesResult] = useState<number>();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const { rdkit } = useContext(RDKitContext);
  const { pyodide } = useContext(PyodideContext);
  const { setTarget, target } = useContext(TargetContext);

  const pathname = usePathname();

  // -----------------------------
  // Reset on route change
  // -----------------------------
  useEffect(() => {
    setScreenData([]);
  }, [pathname]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = oneOffSMILES;
    }
  }, [oneOffSMILES]);

  // -----------------------------
  // One-off prediction
  // -----------------------------
  async function oneOffPred() {
    const requestId = `fingerprint_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    rdkit.postMessage({
      function: "fingerprint",
      id: requestId,
      mol_data: [{ canonical_smiles: oneOffSMILES }],
      activity_columns: target.activity_columns,
      formStuff: {
        fingerprint: localStorage.getItem("fingerprint"),
        radius: parseInt(localStorage.getItem("path") ?? "2"),
        nBits: parseInt(localStorage.getItem("nBits") ?? "2048"),
      },
    });

    rdkit.onmessage = async (event) => {
      if (event.data.id === requestId) {
        const mol_fp = event.data.data[0].fingerprint;

        pyodide.postMessage({
          id: "job-123",
          opts: 0,
          fp: [mol_fp],
          func: "ml-screen",
        });

        pyodide.onmessage = (event) => {
          if (event.data.success === "ok") {
            setOneOffSmilesResult(event.data.results[0]);
          }
        };
      }
    };
  }

  // -----------------------------
  // ML results unpacking
  // -----------------------------
  const hasResults = target.machine_learning && target.machine_learning.length > 0;
  const metric1 = hasResults ? target.machine_learning[0] : [];
  const metric2 = hasResults ? target.machine_learning[1] : [];
  const perFoldPreds = hasResults ? target.machine_learning[2] : [];

  // -----------------------------
  // Merge fold scatter data
  // -----------------------------
  const mergedData: { x: number; y: number }[] = [];
  const foldColorProperty: number[] = [];

  perFoldPreds.forEach((fold, foldIndex) => {
    fold.forEach((point) => {
      mergedData.push({ x: point.x, y: point.y });
      foldColorProperty.push(foldIndex + 1);
    });
  });

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="tools-container">
      <MLResultsContext.Provider value={setScreenData}>
        {/* ---------------- Task Type Selector ---------------- */}
        <Select
          label="ML Task Type"
          value={target.machine_learning_inference_type || "regression"}
          onChange={(v) => setTarget({ ...target, machine_learning_inference_type: v }) }
          data={[
            { value: "regression", label: "Regression" },
            { value: "classification", label: "Classification" },
          ]}
          mb="md"
        />

        {/* ---------------- Children get taskType prop ---------------- */}
        {children}

        {/* ---------------- Single molecule prediction ---------------- */}
        <Group>
          <h2>Predict the activity of a single molecule</h2>

          <Input
            ref={inputRef}
            style={{ width: "20%" }}
            onChange={(e) => setOneOffSmiles(e.target.value)}
            placeholder="Input your SMILES string"
          />

          <Dropdown buttonText="Draw the molecule">
            <JSME
              width="300px"
              height="300px"
              onChange={(smiles) => setOneOffSmiles(smiles)}
            />
          </Dropdown>

          <Button onClick={oneOffPred}>Predict Activity</Button>

          {oneOffSMILESResult !== undefined && (
            <span>
              Predicted {target.activity_columns[0]}: <b>{oneOffSMILESResult}</b>
            </span>
          )}
        </Group>

        {/* ---------------- Scatterplot or barplot ---------------- */}
        {hasResults && (
          <>
            {target.machine_learning_inference_type === "regression" ? (
              <Scatterplot
                data={mergedData}
                discreteColor={true}
                colorProperty={foldColorProperty}
                xAxisTitle="Experimental Activity"
                yAxisTitle="Predicted Activity"
              />
            ) : (
              <FoldMetricBarplot metricName="R2" data={metric2} color="#f59e0b" />
            )}
            <FoldMetricBarplot metricName="Accuracy" data={metric1} color="#3b82f6" />
          </>
        )}
      </MLResultsContext.Provider>
    </div>
  );
}
