import { useContext, useState } from 'react';
import LigandContext from '../../context/LigandContext';
import TargetContext from '../../context/TargetContext';

import SideBar from "./SideBar/SideBar";
import ModalComponent from './ModalComponent';
import { SideBarDropDownItem, SideBarItem, SideBarLink } from './SideBar/SideBarItems';


export default function CornerMenu() {
  const [fileName, setFileName] = useState("Untitled");
  const [modalStae, setModalState] = useState(false);

  const { ligand } = useContext(LigandContext);
  const { target } = useContext(TargetContext);


  function saveWork(e) {
    e.preventDefault();
    const combinedJSON = { target_data: target, ligand_data: ligand, source: localStorage.getItem("dataSource"), fpPath: localStorage.getItem("path"), nBits: localStorage.getItem("nBits"), fp_type: localStorage.getItem("fingerprint") };
    const jsonString = JSON.stringify(combinedJSON, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  return (
    <SideBar>
      <SideBarItem>
        <div>
          <p style={{ fontSize: "small" }}>Current Target: {target.target_name}</p>
          <p style = {{fontSize : "small"}}>Number of Molecules: {ligand.length}</p>
        </div>
      </SideBarItem>
      <SideBarDropDownItem name_of="Data Operations">
        <SideBarLink to="/tools/load_data">Upload Data</SideBarLink>
        <SideBarLink to="/tools/preprocess">Pre-process Data</SideBarLink>
        <SideBarLink to="/tools/toc">Explore Data</SideBarLink>
      </SideBarDropDownItem>

      {target.pre_processed && (
        <>
          <div onClick={() => setModalState(true)}>
            <SideBarItem>Save Work <img height="30px" width="30px" src="/save_disk.svg"></img></SideBarItem>
          </div>
          <div style={{ height: "40px" }}></div>

          <SideBarDropDownItem name_of="Distributions">
            <SideBarLink to="/tools/activity">Activity</SideBarLink>
            <SideBarLink to="/tools/tanimoto">Tanimoto</SideBarLink>
          </SideBarDropDownItem>

          <SideBarDropDownItem name_of="Dimension Reduction">
            <SideBarLink to="/tools/dim-red/pca">PCA</SideBarLink>
            <SideBarLink to="/tools/dim-red/tsne">tSNE</SideBarLink>
          </SideBarDropDownItem>

          <SideBarDropDownItem name_of="Scaffold Operations">
            <SideBarLink to="/tools/mma">MMA</SideBarLink>
            <SideBarLink to="/tools/scaff_net">Scaffold Networks</SideBarLink>
          </SideBarDropDownItem>

          <SideBarDropDownItem name_of="Machine Learning">
            <SideBarLink to="/tools/ml/rf">Random Forest</SideBarLink>
            <SideBarLink to="/tools/ml/xgboost">XGBoost</SideBarLink>
          </SideBarDropDownItem>

          <SideBarDropDownItem name_of="Virtual Screening">
            <SideBarLink to="/tools/screen">Overview</SideBarLink>
            <SideBarLink to="/tools/screen/cov_score">Coverage Score</SideBarLink>
          </SideBarDropDownItem>

          <ModalComponent isOpen={modalStae} closeModal={() => setModalState(false)} height='20' width='20'>
            <form onSubmit={saveWork} className='ml-forms' style={{ width: "18vw" }}>
              <label htmlFor='save_label'>File Name</label>
              <input className='input' id="save_label" onChange={(e) => setFileName(e.target.value)} defaultValue="Untitled"></input>
              <input type="submit" onSubmit={saveWork} className='button' value="Download File" />
            </form>
          </ModalComponent>
        </>
      )}
    </SideBar>
  )
}