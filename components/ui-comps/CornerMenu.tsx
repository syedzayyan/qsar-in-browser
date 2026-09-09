import { useContext, useState } from 'react';
import LigandContext from '../../context/LigandContext';
import TargetContext from '../../context/TargetContext';
import { Button, Group, Modal, NavLink } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import Link from 'next/link';
import { useDisclosure } from '@mantine/hooks';


export default function CornerMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [fileName, setFileName] = useState("Untitled");
  const [opened, { open, close }] = useDisclosure(false);

  const { ligand, setLigand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);

  async function resetApp() {
    if (
      !window.confirm(
        "Reset QITB? This clears any loaded molecule data, saved fingerprint settings, and this app's offline cache - useful if something looks stuck or out of date after an update."
      )
    ) {
      return;
    }

    try {
      localStorage.clear();
    } catch {
      // ignore - private browsing etc. can block storage access
    }

    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // ignore
    }

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }
    } catch {
      // ignore
    }

    setLigand([]);
    setTarget({
      target_id: "",
      target_name: "",
      target_organism: "",
      data_source: "",
      pre_processed: false,
      scaffold_network: undefined,
      scaffCores: [],
      machine_learning: [],
      machine_learning_inference_type: "regression",
    });

    window.location.href = "/";
  }


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
    <div style={{ maxHeight: '100vh', overflowY: 'auto' }}>
    <Group>
      <Group justify="center" align="center">
        <span>{target.target_name}</span>
        <span>Number of Molecules: {ligand.length}</span>
        {target.pre_processed && (<Button onClick={() => open()}>
          Save Work <img height="30px" width="30px" src="/save_disk.svg"></img>
        </Button>)}
      </Group>
      <NavLink label="Data Setup">
        <NavLink component={Link} href="/tools/load_data" label="Load New Data" onClick={onNavigate} />
        <NavLink component={Link} href="/tools/preprocess" label="Generate Fingerprints" onClick={onNavigate} />
        <NavLink component={Link} href="/tools/toc" label="Molecules Table" onClick={onNavigate} />
      </NavLink>

      {target.pre_processed && (
        <>
          <NavLink label="Distribution Histograms">
            <NavLink component={Link} href="/tools/activity" label="Activity" onClick={onNavigate} />
            <NavLink component={Link} href="/tools/tanimoto" label="Similarity" onClick={onNavigate} />
          </NavLink>

          <NavLink label="Chemical Space Maps">
            <NavLink component={Link} href="/tools/dim-red/pca" label="PCA" onClick={onNavigate} />
            <NavLink component={Link} href="/tools/dim-red/tsne" label="t-SNE" onClick={onNavigate} />
          </NavLink>

          <NavLink label="Structural Analysis">
            <NavLink component={Link} href="/tools/mma" label="Common Motifs" onClick={onNavigate} />
            <NavLink component={Link} href="/tools/scaff_net" label="Scaffold Tree" onClick={onNavigate} />
          </NavLink>

          <NavLink label="Machine Learning">
            <NavLink component={Link} href="/tools/ml/fp" label="Train a Model" onClick={onNavigate} />
          </NavLink>

          <NavLink label="Model Predictions">
            <NavLink component={Link} href="/tools/screen" label="Predict from Dataset" onClick={onNavigate} />
            {/* {/* <NavLink component={Link} href="/tools/screen/cov_score" label="Coverage Score" /> */}
            <NavLink component={Link} href="/tools/generative_mol" label="Generative Chemistry (Beta)" onClick={onNavigate} />
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

      <NavLink
        label="Reset App"
        leftSection={<IconRefresh size={16} />}
        onClick={() => {
          onNavigate?.();
          resetApp();
        }}
      />
    </Group>
    </div>
  )
}