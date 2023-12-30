import React, { createContext, useState } from 'react';

const TargetContext = createContext({
    target: {target : "CHEMBL226", target_loaded : false},
    setTarget: () => {},
});

export function TargetProvider({ children }) {
    const [ligand_df, setLigand_df] = useState({target : "CHEMBL226", target_loaded : false});

    return (
        <TargetContext.Provider value={{ target: ligand_df, setTarget: setLigand_df }}>
            {children}
        </TargetContext.Provider>
    );
}

export default TargetContext;
