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
    const [ligand, setLigand] = useState<Record<string, any>[]>([]);

    return (
        <LigandContext.Provider value={{ ligand, setLigand }}>
            {children}
        </LigandContext.Provider>
    );
}

export default LigandContext;
