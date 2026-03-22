// MLResultsContext.tsx
"use client";
import { createContext, useContext, useState, useMemo } from "react";

interface ScreenMol {
  canonical_smiles: string;
  predictions?: number[];
  fingerprint?: number[];
  [key: string]: any;
}

interface MLResultsContextType {
  screenData: ScreenMol[];
  setScreenData: React.Dispatch<React.SetStateAction<ScreenMol[]>>;
  sortedScreenData: ScreenMol[];
  setSortedScreenData: React.Dispatch<React.SetStateAction<ScreenMol[]>>;
  preds: number[];
  setPreds: React.Dispatch<React.SetStateAction<number[]>>;
  screenThreshold: number;
  setScreenThreshold: React.Dispatch<React.SetStateAction<number>>;
}

const MLResultsContext = createContext<MLResultsContextType>({
  screenData: [],
  setScreenData: () => {},
  sortedScreenData: [],
  setSortedScreenData: () => {},
  preds: [],
  setPreds: () => {},
  screenThreshold: 0.5,
  setScreenThreshold: () => {},
});

export function MLResultsContextProvider({ children }: { children: React.ReactNode }) {
  const [screenData, setScreenData] = useState<ScreenMol[]>([]);
  const [sortedScreenData, setSortedScreenData] = useState<ScreenMol[]>([]);
  const [preds, setPreds] = useState<number[]>([]);
  const [screenThreshold, setScreenThreshold] = useState<number>(0.5);

  return (
    <MLResultsContext.Provider value={{
      screenData, setScreenData,
      sortedScreenData, setSortedScreenData,
      preds, setPreds,
      screenThreshold, setScreenThreshold,
    }}>
      {children}
    </MLResultsContext.Provider>
  );
}

export function useMLResults() {
  return useContext(MLResultsContext);
}

export default MLResultsContext;