import Link from 'next/link';
import ThemeSwitcher from './ThemeSwitcher'
const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="logo">
                <Link href="/">
                    SAR IN BROWSER
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
            </ul>
        </nav>
    );
};

export default Navbar;
