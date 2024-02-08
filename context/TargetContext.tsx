import { createContext, useState, ReactNode } from 'react';

interface TargetContextProps {
    target: string; // Replace 'any' with the appropriate type for your theme
    setTarget: React.Dispatch<React.SetStateAction<string>>; // Replace 'any' with the appropriate type for your theme
}

const TargetContext = createContext<TargetContextProps>({
    target: "",
    setTarget: () => {},
});

interface TargetProviderProps {
    children: ReactNode;
}

export function TargetProvider({ children }: TargetProviderProps) {
    const [target, setTarget] = useState("");


    return (
        <TargetContext.Provider value={{ target, setTarget }}>
            {children}
        </TargetContext.Provider>
    );
}

export default TargetContext;
