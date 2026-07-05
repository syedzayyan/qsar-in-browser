import { createContext, useState, ReactNode } from "react";

export type targetType = {
  target_id: string;
  target_name: string;
  target_organism: string;
  pre_processed: boolean;
  data_source: string;
  activity_columns?: string[];
  scaffold_network: any;
  scaffCores: any;
  machine_learning?: any;
  machine_learning_inference_type?: string;
  pca_explained_variance?: number[];
  tsne_explained_variance?: number[];
  pref_name?: string;
};

interface TargetContextProps {
  target: targetType;
  setTarget: React.Dispatch<React.SetStateAction<targetType>>;
}

const TargetContext = createContext<TargetContextProps>({
  target: {
    target_id: "",
    target_name: "",
    target_organism: "",
    data_source: "",
    pre_processed: false,
    scaffold_network: "",
    scaffCores: [],
  },
  setTarget: () => {},
});

interface TargetProviderProps {
  children: ReactNode;
}

const DEFAULT_TARGET: targetType = {
  target_id: "",
  target_name: "",
  target_organism: "",
  data_source: "",
  pre_processed: false,
  scaffold_network: undefined,
  scaffCores: [],
  machine_learning: [],
  machine_learning_inference_type: "regression",
};

export function TargetProvider({ children }: TargetProviderProps) {
  // Lazy initializer so a dataset handed off from another tab (see
  // qitb_transfer_payload in app/tools/screen/page.tsx) is present in
  // context on the very first render — a useEffect would run too late for
  // descendants (e.g. DataPreProcessToolKit's useForm defaultValues) that
  // read `target` synchronously during their own initial render.
  const [target, setTarget] = useState<targetType>(() => {
    // Read-only (see LigandContext.tsx's LigandProvider for why this never
    // removes the key itself — that's left to a useEffect elsewhere).
    if (typeof window === "undefined") return DEFAULT_TARGET;
    try {
      const raw = localStorage.getItem("qitb_transfer_payload");
      if (raw) {
        const payload = JSON.parse(raw);
        if (payload.target_data) return { ...DEFAULT_TARGET, ...payload.target_data };
      }
    } catch (err) {
      console.error("Failed to load transferred target data:", err);
    }
    return DEFAULT_TARGET;
  });

  return (
    <TargetContext.Provider value={{ target, setTarget }}>
      {children}
    </TargetContext.Provider>
  );
}

export default TargetContext;
