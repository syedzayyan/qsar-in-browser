import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface LigandContextProps {
    ligand: Record<string, any>[]; // Array of JSON objects
    setLigand: Dispatch<SetStateAction<Record<string, any>[]>>;
}

const LigandContext = createContext<LigandContextProps>({
    ligand: [],
    setLigand: () => {},
});

interface LigandProviderProps {
    children: ReactNode;
}

export function LigandProvider({ children }: LigandProviderProps) {
    // See TargetContext.tsx's TargetProvider for why this reads the transfer
    // payload synchronously via a lazy initializer rather than a useEffect.
    const [ligand, setLigand] = useState<Record<string, any>[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            // Read-only (no removal here): React Strict Mode double-invokes
            // useState lazy initializers to catch impure code, so a mutation
            // like localStorage.removeItem here would race with itself. The
            // key is cleared once, safely, by a useEffect in
            // app/tools/layout.tsx's DashboardInner instead — effects are
            // fine to double-fire since removeItem is idempotent.
            const raw = localStorage.getItem("qitb_transfer_payload");
            if (raw) {
                const payload = JSON.parse(raw);
                if (payload.ligand_data) return payload.ligand_data;
            }
        } catch (err) {
            console.error("Failed to load transferred ligand data:", err);
        }
        return [];
    });

    return (
        <LigandContext.Provider value={{ ligand, setLigand }}>
            {children}
        </LigandContext.Provider>
    );
}

export default LigandContext;
