import { useContext, useEffect, useState } from "react";
import ThemeContext from "../../context/ThemeContext";

export default function ThemeSwitcher() {
    const {theme, setTheme }= useContext(ThemeContext);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setTheme(savedTheme)
            if (savedTheme === 'dark'){
                setChecked(true)
            }
        } 
    }, [])

    return (
        <div>
            <label className="theme-switcher" htmlFor="themeswitch"> 
                <div className="background"></div>
                <input
                    type="checkbox"
                    id="themeswitch"
                    checked={checked}
                    onChange={() => {
                        setChecked((prevCheck) => !prevCheck);
                        if (theme === 'light') {
                            setTheme('dark');
                            localStorage.setItem('theme', 'dark')
                        } else if (theme === 'dark'){
                            setTheme('light');
                            localStorage.setItem('theme', 'light')
                        }
                    }}
                />

                <div className="switch">
                    <img alt="theme switch to dark" className="moon" src="/moon.png"></img>
                    <img alt="theme switch to light" className="sun" src="/sun.png"></img>
                </div>
            </label>
        </div>
    );
}
