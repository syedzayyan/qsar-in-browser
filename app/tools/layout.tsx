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
import ErrorContext from "../../context/ErrorContext";
import { TargetProvider } from "../../context/TargetContext";
import { LigandProvider } from "../../context/LigandContext";
import { ErrorContextProvider } from "../../context/ErrorContext";
import Navbar from "../../components/ui-comps/Navbar"
import { AppShell, Burger, Flex, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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
  const router = useRouter();
  const [opened, { toggle }] = useDisclosure();

  // useEffect(() => {
  //   if (errors) {
  //     setModalState(true);
  //   }
  // }, [errors]);

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
          pyodide.runPython(``);
          loadRDKit().then((RDK) => {
            setRDKit(RDK);
            setLoading(false);
          });
        });
      });
      setLoadingText("Loading RDKit");
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
      <AppShell
        padding="md"
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
      >
        <AppShell.Header>
          <Flex align="center" justify="space-between">
            <Group>&nbsp;&nbsp;</Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Navbar />
          </Flex>
        </AppShell.Header>
        <TargetProvider>
          <LigandProvider>

            <ErrorContextProvider>
              <AppShell.Navbar>
                <CornerMenu />
              </AppShell.Navbar>
              <AppShell.Main>
                {loading ? (
                  <div>
                    <div className="tools-container" style={{ width: "100%" }}>
                      <Loader loadingText={loadingText} />
                    </div>
                  </div>
                ) : (
                  <>
                    {children}
                  </>
                )}
              </AppShell.Main>
            </ErrorContextProvider>

          </LigandProvider>
        </TargetProvider>
      </AppShell>
    </>
  );
}
