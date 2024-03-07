'use client'

import ThemeSwitcher from './ThemeSwitcher'
const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="logo">
                <a href="/">
                    WORK IN PROGRESS
                </a>
            </div>
            <ul className="navLinks">
                <li>
                    <ThemeSwitcher />
                </li>
                <li>
                    <a href="/about">
                        About
                    </a>
                </li>
                <li>
                    <a href='https://github.com/syedzayyan/qsar-in-browser' target="_blank" rel="noopener noreferrer">
                        Github
                    </a>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;
