import { useEffect, useState } from "react";
import Themes from './Themes';

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState('light');
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setTheme(savedTheme)
            setChecked((theme) => (theme === 'dark'))
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
                        setTheme((theme) => (theme === 'dark' ? 'light' : 'dark'))
                        localStorage.setItem('theme', (theme) => (theme === 'dark' ? 'light' : 'dark'))
                    }}
                />

                <div className="switch">
                    <img alt="theme switch to dark" className="moon" src="/moon.png"></img>
                    <img alt="theme switch to light" className="sun" src="/sun.png"></img>
                </div>
            </label>
            <Themes theme = {theme}/>
        </div>
    );
}
