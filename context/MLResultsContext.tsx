"use client";
import { createContext, useContext, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ScreenMol {
  canonical_smiles: string;
  predictions?: number | number[];
  fingerprint?: number[];
  [key: string]: any;
}

export interface DmpnnLossEntry {
  epoch: number;
  avg_loss: number;
  fold: number | null; // null = simple, n_splits = final model phase
}

interface MLResultsContextType {
  // ── Screening ──────────────────────────────────────────────────────────────
  screenData: ScreenMol[];
  setScreenData: React.Dispatch<React.SetStateAction<ScreenMol[]>>;
  sortedScreenData: ScreenMol[];
  setSortedScreenData: React.Dispatch<React.SetStateAction<ScreenMol[]>>;
  preds: number[];
  setPreds: React.Dispatch<React.SetStateAction<number[]>>;
  screenThreshold: number;
  setScreenThreshold: React.Dispatch<React.SetStateAction<number>>;

  // ── Model readiness ────────────────────────────────────────────────────────
  classicalModelReady: boolean;
  setClassicalModelReady: React.Dispatch<React.SetStateAction<boolean>>;
  dmpnnWeightsReady: boolean;
  setDmpnnWeightsReady: React.Dispatch<React.SetStateAction<boolean>>;

  // ── DMPNN training ─────────────────────────────────────────────────────────
  dmpnnLossHistory: DmpnnLossEntry[];
  setDmpnnLossHistory: React.Dispatch<React.SetStateAction<DmpnnLossEntry[]>>;
  dmpnnTraining: boolean;
  setDmpnnTraining: React.Dispatch<React.SetStateAction<boolean>>;
  dmpnnOneOffResult: number | null;
  setDmpnnOneOffResult: React.Dispatch<React.SetStateAction<number | null>>;
}

// ── Defaults ───────────────────────────────────────────────────────────────────
const noop = () => {};

const MLResultsContext = createContext<MLResultsContextType>({
  screenData: [],
  setScreenData: noop,
  sortedScreenData: [],
  setSortedScreenData: noop,
  preds: [],
  setPreds: noop,
  screenThreshold: 0.5,
  setScreenThreshold: noop,
  classicalModelReady: false,
  setClassicalModelReady: noop,
  dmpnnWeightsReady: false,
  setDmpnnWeightsReady: noop,
  dmpnnLossHistory: [],
  setDmpnnLossHistory: noop,
  dmpnnTraining: false,
  setDmpnnTraining: noop,
  dmpnnOneOffResult: null,
  setDmpnnOneOffResult: noop,
});

// ── Provider ───────────────────────────────────────────────────────────────────
export function MLResultsContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [screenData, setScreenData] = useState<ScreenMol[]>([]);
  const [sortedScreenData, setSortedScreenData] = useState<ScreenMol[]>([]);
  const [preds, setPreds] = useState<number[]>([]);
  const [screenThreshold, setScreenThreshold] = useState(0.5);
  const [classicalModelReady, setClassicalModelReady] = useState(false);
  const [dmpnnWeightsReady, setDmpnnWeightsReady] = useState(false);
  const [dmpnnLossHistory, setDmpnnLossHistory] = useState<DmpnnLossEntry[]>(
    [],
  );
  const [dmpnnTraining, setDmpnnTraining] = useState(false);
  const [dmpnnOneOffResult, setDmpnnOneOffResult] = useState<number | null>(
    null,
  );

  return (
    <MLResultsContext.Provider
      value={{
        screenData,
        setScreenData,
        sortedScreenData,
        setSortedScreenData,
        preds,
        setPreds,
        screenThreshold,
        setScreenThreshold,
        classicalModelReady,
        setClassicalModelReady,
        dmpnnWeightsReady,
        setDmpnnWeightsReady,
        dmpnnLossHistory,
        setDmpnnLossHistory,
        dmpnnTraining,
        setDmpnnTraining,
        dmpnnOneOffResult,
        setDmpnnOneOffResult,
      }}
    >
      {children}
    </MLResultsContext.Provider>
  );
}

export function useMLResults() {
  return useContext(MLResultsContext);
}

export default MLResultsContext;
