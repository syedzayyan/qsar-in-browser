import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';
import LigandContext from '../../context/LigandContext';
import TargetContext from '../../context/TargetContext';
import ModalComponent from './ModalComponent';

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
  const {target} = useContext(TargetContext);

  const [modalStae, setModalState] = useState(false);
  const [fileName, setFileName] = useState("Untitled")

  function saveWork(e){
    e.preventDefault();
    const combinedJSON = {target_data: target, ligand_data : ligand, source : localStorage.getItem("dataSource"), fpPath : localStorage.getItem("path"), nBits : localStorage.getItem("nBits"), fp_type : localStorage.getItem("fingerprint")};
    const jsonString = JSON.stringify(combinedJSON, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  useEffect(() => {
    setStateOfLinks(window.location.href.split(window.location.host)[1]);
  }, [useSearchParams()]);


  const getSvgContainerSize = () => {
    if (window.innerWidth < 768){
      setIsOpen(false)
    }
  };

  useEffect(() => {
    getSvgContainerSize();
    window.addEventListener("resize", getSvgContainerSize);

    return () => window.removeEventListener("resize", getSvgContainerSize);
  }, []);

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
      <p style = {{fontSize : "small"}}>Current Target: {target.target_name}</p>
      <p style = {{fontSize : "small"}}>Number of Molecules: {ligand.length}</p>
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
                    style = {{backgroundColor : stateOfLinks.split('#')[0] === item.subMenuItems[0].link.split('#')[0] && "var(--background-color)", textDecoration : "none"}}
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
        <div className='corner-menu-control-panel'>
          <button className='button' onClick={() => setModalState(true)}>Save Work</button>          
        </div>
      </div>
      <ModalComponent isOpen = {modalStae} closeModal={() => setModalState(false)} height='20' width='20'>
        <form onSubmit={saveWork} className='ml-forms' style = {{width : "18vw"}}>
          <label htmlFor='save_label'>File Name</label>
          <input className='input' id = "save_label" onChange={(e) => setFileName(e.target.value)} defaultValue = "Untitled"></input>   
          <input type="submit" onSubmit={saveWork} className='button' value="Download File"/>       
        </form>
      </ModalComponent>
    </nav>
  );
};

export default CornerMenu;
