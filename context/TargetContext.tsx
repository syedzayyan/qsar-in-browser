import { createContext, useState, ReactNode } from 'react';

export type targetType = {
    target_id: string,
    target_name: string,
    target_organism: string,
    pre_processed: boolean,
    data_source: string,
    activity_columns?: string[],
    scaffold_network: any,
    scaffCores: any,
    machine_learning?: any,
}

interface TargetContextProps {
    target: targetType;
    setTarget: React.Dispatch<React.SetStateAction<targetType>>;
}

const TargetContext = createContext<TargetContextProps>({
    target: { target_id: "", target_name: "", target_organism: "", data_source: "", pre_processed: false, scaffold_network: "", scaffCores: [] },
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
        data_source: "",
        pre_processed: false,
        scaffold_network: "",
        scaffCores: [],
        machine_learning: [],
    });

    return (
        <TargetContext.Provider value={{ target, setTarget }}>
            {children}
        </TargetContext.Provider>
    );
}

export default TargetContext;
