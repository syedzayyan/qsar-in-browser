import Link from 'next/link';
import ThemeSwitcher from './ThemeSwitcher'
const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="logo">
                <Link href="/">
                    QSAR IN THE BROWSER
                </Link>
            </div>
            <ul className="navLinks">
                <li>
                    <ThemeSwitcher />
                </li>
                <li>
                    <Link href="/about">
                        About
                    </Link>
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
