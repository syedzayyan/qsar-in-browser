import { useContext, useState } from "react";
import LigandContext from "../../context/LigandContext";
import TargetContext from "../../context/TargetContext";
import { Button, Group, Modal, NavLink } from "@mantine/core";
import Link from "next/link";
import { useDisclosure } from "@mantine/hooks";
import { readFpSettings } from "../utils/get_fp_settings";

export default function CornerMenu() {
  const [fileName, setFileName] = useState("Untitled");
  const [opened, { open, close }] = useDisclosure(false);

  const { ligand } = useContext(LigandContext);
  const { target } = useContext(TargetContext);

  function saveWork(e) {
    e.preventDefault();
    const combinedJSON = {
      target_data: target,
      ligand_data: ligand,
      source: localStorage.getItem("dataSource"),
      ...readFpSettings(), // fingerprint, fpRadius, fpNBits, radius, nBits, useChirality, …
    };
    const jsonString = JSON.stringify(combinedJSON, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const downloadLink = document.createElement("a");
    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  return (
    <div style={{ maxHeight: "100vh", overflowY: "auto" }}>
      <Group>
        <Group justify="center" align="center">
          <span>{target.target_name}</span>
          <span>Number of Molecules: {ligand.length}</span>
          {target.pre_processed && (
            <Button onClick={() => open()}>
              Save Work{" "}
              <img height="30px" width="30px" src="/save_disk.svg"></img>
            </Button>
          )}
        </Group>
        <NavLink label="Data Setup">
          <NavLink
            component={Link}
            href="/tools/load_data"
            label="Load New Data"
          />
          <NavLink
            component={Link}
            href="/tools/preprocess"
            label="Generate Fingerprints"
          />
          <NavLink component={Link} href="/tools/toc" label="Molecules Table" />
        </NavLink>

        {target.pre_processed && (
          <>
            <NavLink label="Distribution Histograms">
              <NavLink
                component={Link}
                href="/tools/activity"
                label="Activity"
              />
              <NavLink
                component={Link}
                href="/tools/tanimoto"
                label="Similarity"
              />
            </NavLink>

            <NavLink label="Chemical Space Maps">
              <NavLink component={Link} href="/tools/dim-red/pca" label="PCA" />
              <NavLink
                component={Link}
                href="/tools/dim-red/tsne"
                label="t-SNE"
              />
            </NavLink>

            <NavLink label="Structural Analysis">
              <NavLink
                component={Link}
                href="/tools/mma"
                label="Common Motifs"
              />
              <NavLink
                component={Link}
                href="/tools/scaff_net"
                label="Scaffold Tree"
              />
            </NavLink>

            <NavLink label="Machine Learning">
              <NavLink
                component={Link}
                href="/tools/ml/fp"
                label="Classical Models"
              />
              <NavLink
                component={Link}
                href="/tools/ml/dmpnn"
                label="Graph Machine Learning (Chemprop)"
              />
            </NavLink>

            <NavLink label="Model Predictions">
              <NavLink
                component={Link}
                href="/tools/screen"
                label="Predict from Dataset"
              />
              {/* {/* <NavLink component={Link} href="/tools/screen/cov_score" label="Coverage Score" /> */}
              <NavLink
                component={Link}
                href="/tools/generative_mol"
                label="Generate New Molecules"
              />
            </NavLink>

            <Modal opened={opened} onClose={close}>
              <form
                onSubmit={saveWork}
                className="ml-forms"
                style={{ width: "18vw" }}
              >
                <label htmlFor="save_label">File Name</label>
                <input
                  className="input"
                  id="save_label"
                  onChange={(e) => setFileName(e.target.value)}
                  defaultValue="Untitled"
                ></input>
                <input
                  type="submit"
                  onSubmit={saveWork}
                  className="button"
                  value="Download File"
                />
              </form>
            </Modal>
          </>
        )}
      </Group>
    </div>
  );
}
