import { createContext } from "react";


export const MLResultsContext = createContext<React.Dispatch<React.SetStateAction<any[]>>>(null);