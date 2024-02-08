import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface RDKitContextProps {
    rdkit: Record<string, any>; // Assuming RDKit is an object
    setRDKit: React.Dispatch<React.SetStateAction<any>>
}

const RDKitContext = createContext<RDKitContextProps>({
    rdkit: {},
    setRDKit: () => {},
});

interface RDKitProviderProps {
    children: ReactNode;
}

export function RDKitProvider({ children }: RDKitProviderProps) {
    const [rdkit, setRDKit] = useState<Record<string, any>>({}); 

    return (
        <RDKitContext.Provider value={{ rdkit, setRDKit }}>
            {children}
        </RDKitContext.Provider>
    );
}

export default RDKitContext;
