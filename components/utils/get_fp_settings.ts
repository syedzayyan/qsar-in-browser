// Reads the fingerprint settings that DataPreProcessToolKit / ml layout
// already persist to localStorage ("fingerprint", "path", "nBits") so other
// tools (e.g. the generative-mol GA page) can fingerprint new candidate
// SMILES the same way the currently-trained model was fingerprinted.
export type FpSettings = {
  fingerprint: "maccs" | "morgan" | "rdkit_fp";
  radius: number;
  nBits: number;
};

export function readFpSettings(): FpSettings {
  const fingerprint = (localStorage.getItem("fingerprint") as FpSettings["fingerprint"]) || "maccs";
  const radius = parseInt(localStorage.getItem("path") ?? "2", 10) || 2;
  const nBits = parseInt(localStorage.getItem("nBits") ?? "1024", 10) || 1024;
  return { fingerprint, radius, nBits };
}
