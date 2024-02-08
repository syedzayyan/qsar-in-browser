import { createContext } from 'react';

interface ThemeContextProps {
    theme: string; // Replace 'any' with the appropriate type for your theme
    setTheme: React.Dispatch<React.SetStateAction<string>>; // Replace 'any' with the appropriate type for your theme
}

const ThemeContext = createContext<ThemeContextProps>({
    theme: "light",
    setTheme: () => {},
});


export default ThemeContext;
