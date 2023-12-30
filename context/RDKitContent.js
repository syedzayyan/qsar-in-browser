import React, { createContext, useEffect, useState } from 'react';

const RDKitContext = createContext({
    ligand: {rdkit_state : false, rdkit_wasm : null},
    setLigand: () => {},
});

export function RDKitProvider({ children }) {
    
    const [rdkit, setRDKit] = useState({rdkit_state : false, rdkit_wasm : null});

    return (
        <RDKitContext.Provider value={{ ligand: rdkit, setLigand: setRDKit }}>
            {children}
        </RDKitContext.Provider>
    );
}

export default RDKitContext;
