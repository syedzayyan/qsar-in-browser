import { createContext, useState, ReactNode } from 'react';

export type targetType = {
    target_id: string,
    target_name: string,
    target_organism: string,
    pre_processed: boolean,
    activity_type?: string,
}

interface TargetContextProps {
    target: targetType;
    setTarget: React.Dispatch<React.SetStateAction<targetType>>;
}

const TargetContext = createContext<TargetContextProps>({
    target: { target_id: "", target_name: "", target_organism: "", pre_processed: false},
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
        pre_processed: false,
    });

    return (
        <TargetContext.Provider value={{ target, setTarget }}>
            {children}
        </TargetContext.Provider>
    );
}

export default TargetContext;
