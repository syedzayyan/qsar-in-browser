import { createContext, useState, ReactNode } from 'react';

export type targetType = {
    target_id: string,
    target_name: string,
    target_organism: string,
}

interface TargetContextProps {
    target: targetType;
    setTarget: React.Dispatch<React.SetStateAction<targetType>>;
}

const TargetContext = createContext<TargetContextProps>({
    target: { target_id: "", target_name: "", target_organism: "" },
    setTarget: () => {},
});

interface TargetProviderProps {
    children: ReactNode;
}

export function TargetProvider({ children }: TargetProviderProps) {
    const [target, setTarget] = useState<targetType>({
        target_id: "",
        target_name: "",
        target_organism: "",
    });

    return (
        <TargetContext.Provider value={{ target, setTarget }}>
            {children}
        </TargetContext.Provider>
    );
}

export default TargetContext;
