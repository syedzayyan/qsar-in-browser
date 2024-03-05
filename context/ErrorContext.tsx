import { ReactNode, createContext, useState } from 'react';

interface ErrorContextProps {
    errors: string; // Replace 'any' with the appropriate type for your theme
    setErrors: React.Dispatch<React.SetStateAction<string>>; // Replace 'any' with the appropriate type for your theme
}

const ErrorContext = createContext<ErrorContextProps>({
    errors: "light",
    setErrors: () => {},
});

interface ErrorProviderContextProps {
    children: ReactNode;
}

export function ErrorContextProvider({ children }: ErrorProviderContextProps) {
    const [errors, setErrors] = useState<string>();

    return (
        <ErrorContext.Provider value={{ errors, setErrors }}>
            {children}
        </ErrorContext.Provider>
    );
}


export default ErrorContext;
