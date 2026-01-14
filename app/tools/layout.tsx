"use client";
import { useContext, useEffect, useState } from "react";
import CornerMenu from "../../components/ui-comps/CornerMenu";
import PyodideContext from "../../context/PyodideContext";
import RDKitContext from "../../context/RDKitContext";
import LigandContext from "../../context/LigandContext";
import { useRouter } from "next/navigation";
import ErrorContext from "../../context/ErrorContext";
import TargetContext from "../../context/TargetContext";
import { ErrorContextProvider } from "../../context/ErrorContext";
import Navbar from "../../components/ui-comps/Navbar"
import { AppShell, Burger, Flex, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Notification } from '@mantine/core';
import { MLResultsContext } from "../../context/MLResultsContext";
import NotificationContext from "../../context/NotificationContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setLigand, ligand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);
  const { pyodide, setPyodide } = useContext(PyodideContext);
  const { rdkit, setRDKit } = useContext(RDKitContext);
  const { notification, setNotification } = useContext(NotificationContext);
  const router = useRouter();
  const [opened, { toggle }] = useDisclosure();

  const setScreenData = useContext(MLResultsContext);

  useEffect(() => {
    const pyodideWorker = new Worker("/workers/pyodide.mjs", { type: "module" });
    const rdkitWorker = new Worker("/workers/rdkit.mjs");
    setRDKit(rdkitWorker);
    setPyodide(pyodideWorker);
    if (ligand.length < 1) {
      setNotification("Data Loading Done!")
      router.push("/tools/load_data");
    }
  }, []);

  if (rdkit) {
    rdkit.onmessage = (event) => {
      const message = event.data;
      if (typeof message === 'string') {
        setNotification(message);
      } else if (message.data) {
        switch (message.function) {
          case 'fingerprint':
            if (message.settings) {
              localStorage.setItem("fingerprint", message.settings.fingerprint);
              localStorage.setItem("path", message.settings.radius.toString());
              localStorage.setItem("nBits", message.settings.nBits.toString());
            }
            setNotification("Molecule Pre-processing Done! Going to Activity Distribution Tool...");
            setTimeout(() => {
              setLigand(message.data);
              setTarget({ ...target, activity_columns: message.activity_columns, pre_processed: true });
              router.push("/tools/activity")
            }, 200);
            break;
          case 'mma':
            setNotification("Massive Molecular Analysis Done! Going to Scaffold Analysis Tool...");
            setTarget({ ...target, scaffCores: message.data });
            break;
          case 'tanimoto':
            setNotification("Tanimoto Similarity Calculation Done!");
            setLigand(message.data);
            break;
          default:
            break;
        }
      } else if (message.error) {
        rdkit.terminate();
      }
    };
  }

  if (pyodide) {
    pyodide.onmessage = (event) => {
      const message = event.data;
      if (typeof message === 'string') {
        setNotification(message);
      }
      if (message.func === "dim_red") {
        if (message.opts === 2 || message.opts === 3) {
          setNotification("tSNE Processing Done!");
          setLigand((prevLigands) => {
            return prevLigands.map((ligand, index) => ({
              ...ligand,
              tsne: message.result[index],
            }));
          });
        } else {
          setNotification("PCA Processing Done!");
          setLigand((prevLigands) => {
            return prevLigands.map((ligand, index) => ({
              ...ligand,
              pca: message.result[index],
            }));
          });
        }        
      } else if (message.func === "ml") {
        setNotification("Model Training Done! Going to Results Page...");
        setTarget({ ...target, machine_learning: message.results });
      } else {
        console.log(message);
      }
    }
  }

  return (
    <>
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

        <ErrorContextProvider>
          <AppShell.Navbar>
            <CornerMenu />
          </AppShell.Navbar>
          <AppShell.Main>
            {children}
          </AppShell.Main>
        </ErrorContextProvider>

      </AppShell>

      {/* Bottom-right notification */}
      {notification != "" && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
        }}>
          <Notification
            radius="lg"
            title="Notifications"
            onClose={() => setNotification("")}
            withCloseButton
          >
            {notification}
          </Notification>
        </div>
      )}
    </>
  );
}