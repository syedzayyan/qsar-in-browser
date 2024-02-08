import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface PyodideContextProps {
    pyodide: Record<string, any>; // Assuming pyodide is an object
    setPyodide: React.Dispatch<React.SetStateAction<any>>
}

const PyodideContext = createContext<PyodideContextProps>({
    pyodide: {},
    setPyodide: () => {},
});

interface PyodideProviderProps {
    children: ReactNode;
}

export function PyodideProvider({ children }: PyodideProviderProps) {
    const [pyodide, setPyodide] = useState<Record<string, any>>({}); // Assuming pyodide is an object

    return (
        <PyodideContext.Provider value={{ pyodide, setPyodide }}>
            {children}
        </PyodideContext.Provider>
    );
}

export default PyodideContext;
