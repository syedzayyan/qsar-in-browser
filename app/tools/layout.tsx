"use client";

import { useContext, useEffect, useState } from "react";
import CornerMenu from "../../components/ui-comps/CornerMenu";
import PyodideContext from "../../context/PyodideContext";
import RDKitContext from "../../context/RDKitContext";
import { initRDKit } from "../../components/utils/rdkit_loader";
import Loader from "../../components/ui-comps/Loader";
import Script from "next/script";
import LigandContext from "../../context/LigandContext";
import { useRouter } from "next/navigation";
import ModalComponent from "../../components/ui-comps/ModalComponent";
import ErrorContext from "../../context/ErrorContext";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setPyodide } = useContext(PyodideContext);
  const { setRDKit } = useContext(RDKitContext);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Loading Pyodide...");
  const { ligand } = useContext(LigandContext);
  const { errors, setErrors } = useContext(ErrorContext);
  const [modalState, setModalState] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (errors) {
      setModalState(true);
    }
  }, [errors]);

  useEffect(() => {
    if (ligand.length < 1) {
      router.push("/tools/load_data");
    }
  }, []);

  async function loadRDKit() {
    const RDK = await initRDKit();
    return RDK;
  }

  async function pyodideLoaded() {
    try {
      await globalThis.loadPyodide().then((pyodide) => {
        pyodide.loadPackage(["scikit-learn", "numpy"]).then(() => {
          setPyodide(pyodide);
        });
      });
      setLoadingText("Loading RDKit");
      await loadRDKit().then((RDK) => {
        setRDKit(RDK);
        setLoading(false);
      });
    } catch (e) {
      console.error(e);
      setErrors("Pyodide and RDKit had problems loading");
    }
  }

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"
        onLoad={pyodideLoaded}
      ></Script>
      {loading ? (
        <div>
          <div className="tools-container" style = {{width : "100%"}}>
          <Loader loadingText={loadingText} />
          </div>
          </div>
      ) : (
        <div className="tools-main-container">
          <CornerMenu />
          {children}
        </div>
      )}
      <ModalComponent
        isOpen={modalState}
        closeModal={() => setModalState(false)}
      >
        {errors}
      </ModalComponent>

    </>
  );
}
