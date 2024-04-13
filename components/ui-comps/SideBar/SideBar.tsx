import { useEffect, useState } from "react";

export default function SideBar({ children }) {
    const [isOpen, setIsOpen] = useState(true);
    const [smallScreen, setSmallScreen] = useState(false);

    const handleResize = () => {
        if (window.innerWidth < 850){
            setIsOpen(false);
            setSmallScreen(true);
        }
        if (window.innerWidth >= 850){
            setIsOpen(true);
            setSmallScreen(false);
        }
    }
    useEffect(() => {
      window.addEventListener("resize", handleResize, false);
    }, []);

    return (
        <nav>
            {!isOpen && 
                <button 
                    onClick={() => {setIsOpen(true)}} 
                    className="sidebar-link" 
                    style={{
                        width : smallScreen && '100vw',
                        fontSize: '1em',
                        backgroundColor: 'white',
                        marginTop: '60px'
                    }}
                >
                    Open Menu
                    <img
                        src="/nav_arrow.svg"
                        style={{
                            width: '30px', // Set the width of the icon
                            height: '30px',
                        }}>
                    </img>
                </button>
            }
            <div
                className="sidebar-container"
                style={{
                    display: isOpen ? 'block' : 'none'
                }}
            >
                {smallScreen && <div
                    className="sidebar-link"
                    onClick={() => setIsOpen((prevState) => !prevState)}>
                    <span>Close Menu</span>
                </div>}
                {children}
            </div>
        </nav>
    );
}
