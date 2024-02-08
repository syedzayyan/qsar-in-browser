import Link from 'next/link';
import React, { useState } from 'react';

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
                    className='collapsible-menu'
                    type="radio"
                    name="menu"
                    id={`collapsed-menu-${index}`}
                    onChange={() => { }} // You can add a real onChange handler if needed
                  />
                  <label
                    htmlFor={`collapsed-menu-${index}`}
                    className="collapsible-label"
                  >
                    {item.label}
                  </label>
                  <article className={`sub-col-menu-${index}`}>
                    {item.subMenuItems.map((subItem, subIndex) => (
                      <Link className='submenu-links' key={subIndex} href={subItem.link}>{subItem.label}</Link>
                    ))}
                  </article>
                </>
              ) : (
                  <Link className='collapsible-menu' style = {{textDecoration : "none"}} href={item.link}>{item.label}</Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default CornerMenu;
