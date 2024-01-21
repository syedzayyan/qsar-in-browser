import React, { createContext, useState } from 'react';

const PyodideContext = createContext({
    pyodide: [],
    setPyodide: () => {},
});

export function PyodideProvider({ children }) {
    const [pyodide, setPyodide] = useState([]);

    
    return (
        <PyodideContext.Provider value={{ pyodide, setPyodide }}>
            {children}
        </PyodideContext.Provider>
    );
}

export default PyodideContext;
