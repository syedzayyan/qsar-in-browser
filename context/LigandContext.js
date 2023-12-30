import React, { createContext, useEffect, useState } from 'react';

const LigandContext = createContext({
    ligand: [],
    setLigand: () => {},
});

export function LigandProvider({ children }) {
    const [ligand, setLigand] = useState([]);

    
    return (
        <LigandContext.Provider value={{ ligand: ligand, setLigand: setLigand }}>
            {children}
        </LigandContext.Provider>
    );
}

export default LigandContext;
