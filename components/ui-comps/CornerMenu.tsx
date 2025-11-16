import { useContext, useState } from 'react';
import LigandContext from '../../context/LigandContext';
import TargetContext from '../../context/TargetContext';
import { Button, Group, Modal, NavLink } from '@mantine/core';
import Link from 'next/link';
import { useDisclosure } from '@mantine/hooks';


export default function CornerMenu() {
  const [fileName, setFileName] = useState("Untitled");
  const [opened, { open, close }] = useDisclosure(false);

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
    <Group>
      <Group justify="center" align="center">
        <span>{target.target_name}</span>
        <span>Number of Molecules: {ligand.length}</span>
        {target.pre_processed && (<Button onClick={() => open()}>
          Save Work <img height="30px" width="30px" src="/save_disk.svg"></img>
        </Button>)}
      </Group>
      <NavLink label="Data Operations">
        <NavLink component={Link} href="/tools/load_data" label="Load Data" />
        <NavLink component={Link} href="/tools/preprocess" label="Pre-process Data" />
        <NavLink component={Link} href="/tools/toc" label="Explore Data" />
      </NavLink>

      {target.pre_processed && (
        <>
          <NavLink label="Distributions">
            <NavLink component={Link} href="/tools/activity" label="Activity" />
            <NavLink component={Link} href="/tools/tanimoto" label="Tanimoto" />
          </NavLink>

          <NavLink label="Dimension Reduction">
            <NavLink component={Link} href="/tools/dim-red/pca" label="PCA" />
            <NavLink component={Link} href="/tools/dim-red/tsne" label="tSNE" />
          </NavLink>

          <NavLink label="Scaffold Operations">
            <NavLink component={Link} href="/tools/mma" label="MMA" />
            <NavLink component={Link} href="/tools/scaff_net" label="Scaffold Networks" />
          </NavLink>

          <NavLink label="Machine Learning">
            <NavLink component={Link} href="/tools/ml/fp" label="Fingerprint-Based Models" />
          </NavLink>

          <NavLink label="Virtual Screening">
            <NavLink component={Link} href="/tools/screen" label="Overview" />
            <NavLink component={Link} href="/tools/screen/cov_score" label="Coverage Score" />
          </NavLink>

          <Modal opened={opened} onClose={close}>
            <form onSubmit={saveWork} className='ml-forms' style={{ width: "18vw" }}>
              <label htmlFor='save_label'>File Name</label>
              <input className='input' id="save_label" onChange={(e) => setFileName(e.target.value)} defaultValue="Untitled"></input>
              <input type="submit" onSubmit={saveWork} className='button' value="Download File" />
            </form>
          </Modal>
        </>
      )}
    </Group>
  )
}