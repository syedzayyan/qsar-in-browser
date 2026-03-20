"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type GAState = {
  isRunning: boolean;
  gen: number;
  bestScore: number;
  bestSmiles: string;
  population: string[];
  scores: number[];
};

type GAContextValue = {
  gaState: GAState;
  setGAState: React.Dispatch<React.SetStateAction<GAState>>;
};

const defaultState: GAState = {
  isRunning: false,
  gen: 0,
  bestScore: 0,
  bestSmiles: "",
  population: [],
  scores: [],
};

const GAContext = createContext<GAContextValue | null>(null);

export function useGAContext() {
  const ctx = useContext(GAContext);
  if (!ctx) throw new Error("useGAContext must be used within GAContextProvider");
  return ctx;
}

export function GAContextProvider({ children }: { children: ReactNode }) {
  const [gaState, setGAState] = useState<GAState>(defaultState);
  return (
    <GAContext.Provider value={{ gaState, setGAState }}>
      {children}
    </GAContext.Provider>
  );
}