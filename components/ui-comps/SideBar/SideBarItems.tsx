import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function SideBarItem({ children }) {
    return (
        <div className="sidebar-link">
            {children}
        </div>
    );
}

export function SideBarDropDownItem({ name_of, children, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="sidebar-dropdown-link">
            <div
                className="sidebar-link"
                onClick={() => !disabled && setIsOpen((prevState) => !prevState)}
            >
                <span>{name_of} </span>
                <img
                    src="/up_arrow.svg"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                        opacity: 1,
                        width: '30px', // Set the width of the icon
                        height: '30px',
                    }}
                >
                </img>
            </div>
            <div
                className="sidebar-dropdown-content"
            >
                {isOpen && children}
            </div>
        </div>
    );
}


export function SideBarLink({ to, children, margin = true }) {
    const pathname = usePathname();

    return (
        <Link
            href={to}
            style={{ textDecoration: 'none', color: "var(--font-color)" }}
        >
            <div
                className="sidebar-link"
                style={{
                    backgroundColor: pathname === to && 'var(--accent-color)',
                    fontWeight: pathname === to ? 'bold' : 'normal',
                    marginLeft: margin && '15px',
                }}
            >

                {children}

            </div>
        </Link>
    );
}