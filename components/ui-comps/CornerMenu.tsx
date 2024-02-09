import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';
import LigandContext from '../../context/LigandContext';

export interface MenuItem {
  label: string;
  link: string;
  subMenuItems?: MenuItem[];
}

interface CornerMenuProps {
  items: MenuItem[];
}

const CornerMenu: React.FC<CornerMenuProps> = (props) => {
  const [isOpen, setIsOpen] = useState(true);
  const [stateOfLinks, setStateOfLinks] = useState("");
  const {ligand} = useContext(LigandContext);

  useEffect(() => {
    setStateOfLinks(window.location.href.split(window.location.host)[1]);
}, [useSearchParams()]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className={`corner-menu ${isOpen ? 'open' : ''}`}>
      <div className="hamburger" onClick={toggleMenu}>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
      </div>
      <div className={`menu-items ${isOpen ? 'open' : ''}`}>
        <ul className='ac-container'>
          {props.items.map((item, index) => (
            <li key={index} className='corner-menu-list-item'>
              {item.subMenuItems ? (
                <>
                  <input
                    defaultChecked={index === 0}
                    className="collapsed-menu collapsed-menu-open"
                    type="radio"
                    name="menu"
                    id={`collapsed-menu-${index}`}
                    disabled = {ligand[0].fingerprint === undefined}
                  />
                  <label
                    htmlFor={`collapsed-menu-${index}`}
                    className="collapsible-label"
                  >
                    {item.label}
                  </label>
                  <article className={`sub-col-menu-${index}`}>
                    {item.subMenuItems.map((subItem, subIndex) => (
                      <Link 
                        style = {{backgroundColor : stateOfLinks === subItem.link && "var(--accent-color)"}}
                        className='submenu-links' key={subIndex} href={subItem.link}>{subItem.label}</Link>
                    ))}
                  </article>
                </>
              ) : (
                  <Link 
                    style = {{backgroundColor : stateOfLinks === item.link && "var(--accent-color)", textDecoration : "none"}}
                    className='collapsible-menu' href={item.link}>{item.label}</Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default CornerMenu;
