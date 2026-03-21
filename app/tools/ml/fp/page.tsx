"use client"

import { useContext, useState } from "react";
import PyodideContext from "../../../../context/PyodideContext";
import RF from "../../../../components/ml-forms/RF";
import XGB from "../../../../components/ml-forms/XGB";
import { Tabs, NumberInput } from "@mantine/core";
import LigandContext from "../../../../context/LigandContext";
import TargetContext from "../../../../context/TargetContext";
import NotificationContext from "../../../../context/NotificationContext";


export default function RandomForest() {
  const { pyodide } = useContext(PyodideContext);
  const { pushNotification } = useContext(NotificationContext);

  const { ligand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);

  const [threshold, setThreshold] = useState<number | null>(null);

  async function onSubmit(data: any) {
    const requestID = `machine_learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    pushNotification({ message: "Running Machine Learning...", id: requestID, type: "info", autoClose: false });

    let y = ligand.map(obj => obj[target.activity_columns[0]]);
    if (target.machine_learning_inference_type === "classification" && threshold !== null) {
      y = y.map(v => (v >= threshold ? 1 : 0));
    }

    pyodide.postMessage({
      id: requestID,
      func: "ml",
      fp: ligand.map(mol => mol.fingerprint),
      opts: data.model,
      params: {
        ...data,
        activity_columns: y,
        task_type: target.machine_learning_inference_type,
        threshold,
      },
    });

    pyodide.onmessage = (event) => {
      const { id: evtId, ok, results, error } = event.data;
      if (evtId !== requestID) return;

      if (!ok || error) {
        pushNotification({ message: `ML failed: ${error}`, id: requestID, type: "error", autoClose: true });
        return;
      }

      // results = [metric1, metric2, flatData]
      setTarget(prev => ({ ...prev, machine_learning: results }));
      pushNotification({ message: "ML training complete!", id: requestID, type: "success", autoClose: true });
    };
  }

  return (
    <div>
      <h1>Machine Learning</h1>

      {/* ========================= */}
      {/* Activity threshold (only for classification) */}
      {/* ========================= */}
      {target.machine_learning_inference_type === "classification" && (
        <NumberInput
          label="Activity threshold (optional)"
          description="If set, activity ≥ threshold → 1, else 0. Leave empty if CSV already contains labels."
          value={threshold}
          onChange={(v) => {
            if (v === null || v === undefined || v === "") {
              setThreshold(null);
            } else if (typeof v === "number") {
              setThreshold(v);
            } else {
              setThreshold(Number(v));
            }
          }}
          mb="md"
        />
      )}

      {/* ========================= */}
      {/* Models */}
      {/* ========================= */}
      <Tabs defaultValue="random-forest">
        <Tabs.List>
          <Tabs.Tab value="random-forest">Random Forest</Tabs.Tab>
          <Tabs.Tab value="xgboost">XGBoost</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="random-forest">
          <RF onSubmit={onSubmit} taskType={target.machine_learning_inference_type as "classification" | "regression"} />
        </Tabs.Panel>

        <Tabs.Panel value="xgboost">
          <XGB onSubmit={onSubmit} taskType={target.machine_learning_inference_type as "classification" | "regression"} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
