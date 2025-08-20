'use client'

import ThemeSwitcher from './ThemeSwitcher'
const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="logo">
                <a href="/">
                    QSAR IN THE BROWSER
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
            </ul>
        </nav>
    );
};

export default Navbar;
