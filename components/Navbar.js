import Link from 'next/link';

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
                    <Link href="/about">
                        About
                    </Link>
                </li>
                <li>
                    <Link href="/contact">
                        Donate
                    </Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;
