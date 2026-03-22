"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PyodideContext from "../../../context/PyodideContext";
import TargetContext from "../../../context/TargetContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../components/tools/toolViz/DropDown";
import { Button, Group, Input, Select } from "@mantine/core";
import FoldMetricBarplot from "../../../components/tools/toolViz/BarChart";
import DiscreteScatterplot from "../../../components/tools/toolViz/DiscreteScatterPlot";
import { round } from "mathjs";
import NotificationContext from "../../../context/NotificationContext";
import { readFpSettingsAsFormStuff } from "../../../components/utils/get_fp_settings";
import LigandContext from "../../../context/LigandContext";

export default function MLLayout({ children }) {

  const [oneOffSMILES, setOneOffSmiles] = useState("CCO");
  const [oneOffSMILESResult, setOneOffSmilesResult] = useState<number>();
  const { setLigand } = useContext(LigandContext);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [rdkit, setRDKIT] = useState<Worker>();
  const { pyodide } = useContext(PyodideContext);
  const { setTarget, target } = useContext(TargetContext);
  const { pushNotification } = useContext(NotificationContext);
  const pathname = usePathname();

  // -----------------------------
  // Reset on route change
  // -----------------------------

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = oneOffSMILES;
    }
  }, [oneOffSMILES]);

  useEffect(() => {
    const pyodideWorker = new Worker("/workers/pyodide.mjs", { type: "module" });
    const rdkitWorker = new Worker("/workers/rdkit.mjs");

    setRDKIT(rdkitWorker);
  }, [])

  // -----------------------------
  // One-off prediction
  // -----------------------------
  async function oneOffPred() {
    const requestId = `machine_learning_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    pushNotification({
      message: "Your one-off prediction is being processed.",
      type: "success",
      id: requestId,
      done: false,
      autoClose: true,
    });

    rdkit.postMessage({
      function: "only_fingerprint",
      id: requestId,
      mol_data: [{ canonical_smiles: oneOffSMILES }],
      activity_columns: target.activity_columns,
      formStuff: readFpSettingsAsFormStuff(),
    });

    rdkit.onmessage = async (event) => {
      const { id: evtId, function: evtFunc, results, ok, error } = event.data;

      if (evtId !== requestId || evtFunc !== 'only_fingerprint') return;

      if (error) {
        pushNotification({ message: `Fingerprint error: ${error}`, type: "error", id: requestId, done: true });
        return;
      }

      if (!results?.[0]?.fingerprint) {
        pushNotification({ message: "No fingerprint returned", type: "error", id: requestId, done: true });
        return;
      }

      const mol_fp = results[0].fingerprint;

      pyodide.postMessage({
        id: requestId,
        opts: target.machine_learning_inference_type === "regression" ? 1 : 2,
        fp: [mol_fp],
        func: "ml_screen",
        params: {
          model: target.machine_learning_inference_type === "regression" ? 1 : 2,
        },
      });

      pyodide.onmessage = (event) => {
        const { id: pEvtId, ok, result, error } = event.data;
        if (pEvtId !== requestId) return;

        if (error) {
          pushNotification({ message: `Prediction error: ${error}`, type: "error", id: requestId, done: true });
          return;
        }

        setOneOffSmilesResult(result[0]);
      };
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
  const foldColorProperty: string[] = [];

  perFoldPreds.forEach((fold, foldIndex) => {
    fold.forEach((point) => {
      mergedData.push({ x: point.x, y: point.y });
      foldColorProperty.push(`Fold ${foldIndex + 1}`);
    });
  });

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="tools-container">
      {/* ---------------- Task Type Selector ---------------- */}
      {/* Task Type Selector + Clear Button */}
      <Group>
        <h3>ML Task Type</h3>
        <Select
          value={target.machine_learning_inference_type}
          onChange={(v) => setTarget({ ...target, machine_learning_inference_type: v })}
          data={[
            { value: "regression", label: "Regression" },
            { value: "classification", label: "Classification" },
          ]}
          style={{ flex: 1 }}
          disabled={hasResults}  // Still lock after results
        />

        {hasResults && (
          <Button
            variant="light"
            color="gray"
            onClick={() => {
              setTarget({
                ...target,
                machine_learning: [],
                machine_learning_inference_type: "regression"  // Reset to allow re-selection
              });
              setOneOffSmilesResult(undefined);
              setLigand(prev => prev.map(lig => {
                const { predictions, ...rest } = lig;
                return rest;
              }));
            }}
          >
            Clear Results
          </Button>
        )}
      </Group>


      {/* ---------------- Children get taskType prop ---------------- */}
      <details open={!hasResults}>
        <summary>{hasResults && <>Reveal ML Forms</>}</summary>
        {children}
      </details>

      {/* ---------------- Scatterplot or barplot ---------------- */}
      {hasResults && (
        <>
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
                <b>{target.machine_learning_inference_type === "regression" && <>
                  Predicted {target.activity_columns[0]}: {round(oneOffSMILESResult, 2)}
                </>}
                </b>
                <b>{target.machine_learning_inference_type === "classification" &&
                  <Group style={{ marginLeft: "10px" }}>
                    <span>Active Probability: {oneOffSMILESResult[0]}</span>
                    <span>Inactive Probability: {oneOffSMILESResult[1]}</span>
                  </Group>
                }
                </b>
              </span>
            )}
          </Group>
          {target.machine_learning_inference_type === "regression" && (
            <>
              <DiscreteScatterplot
                data={mergedData}
                discreteColor={true}
                colorLabels={foldColorProperty}
                xAxisTitle="Experimental Activity"
                yAxisTitle="Predicted Activity"
              />
              <FoldMetricBarplot metricName="Mean Absolute Error" data={metric1} color="#3b82f6" />
            </>
          )}
          {target.machine_learning_inference_type === "classification" && (
            <Group align="flex-start">
              <FoldMetricBarplot metricName="Accuracy" data={metric1} color="#3b82f6" />
              <FoldMetricBarplot metricName="ROC-AUC Score" data={metric2} color="#f59e0b" />
            </Group>
          )}
        </>
      )}
    </div>
  );
}