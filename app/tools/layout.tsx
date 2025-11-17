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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setLigand, ligand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);
  const { pyodide, setPyodide } = useContext(PyodideContext);
  const { rdkit, setRDKit } = useContext(RDKitContext);
  const { errors, setErrors } = useContext(ErrorContext);
  const router = useRouter();
  const [opened, { toggle }] = useDisclosure();

  const setScreenData = useContext(MLResultsContext);

  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState("");

  useEffect(() => {
    const pyodideWorker = new Worker("/workers/pyodide.mjs", { type: "module" });
    const rdkitWorker = new Worker("/workers/rdkit.mjs");
    setRDKit(rdkitWorker);
    setPyodide(pyodideWorker);
    if (ligand.length < 1) {
      setNotificationText("Data Loading Done!")
      setShowNotification(true);
      router.push("/tools/load_data");
    }
  }, []);

  if (rdkit) {
    rdkit.onmessage = (event) => {
      const message = event.data;
      if (typeof message === 'string') {
        setNotificationText(message);
        setShowNotification(true);
      } else if (message.data) {
        setShowNotification(true);
        switch (message.function) {
          case 'fingerprint':
            if (message.settings) {
              localStorage.setItem("fingerprint", message.settings.fingerprint);
              localStorage.setItem("path", message.settings.radius.toString());
              localStorage.setItem("nBits", message.settings.nBits.toString());
            }
            setNotificationText("Molecule Pre-processing Done! Going to Activity Distribution Tool...");
            setTimeout(() => {
              setLigand(message.data);
              setTarget({ ...target, activity_columns: message.activity_columns, pre_processed: true });
              router.push("/tools/activity")
            }, 200);
            break;
          case 'mma':
            setNotificationText("Massive Molecular Analysis Done! Going to Scaffold Analysis Tool...");
            setTarget({ ...target, scaffCores: message.data });
            break;
          case 'tanimoto':
            setNotificationText("Tanimoto Similarity Calculation Done!");
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
      setShowNotification(true);
      const message = event.data;
      if (typeof message === 'string') {
        setNotificationText(message);
        setShowNotification(true);
      }
      if (message.func === "dim_red") {
        if (message.opts === 2 || message.opts === 3) {
          setNotificationText("tSNE Processing Done!");
          setLigand((prevLigands) => {
            return prevLigands.map((ligand, index) => ({
              ...ligand,
              tsne: message.result[index],
            }));
          });
        } else {
          setNotificationText("PCA Processing Done!");
          setLigand((prevLigands) => {
            return prevLigands.map((ligand, index) => ({
              ...ligand,
              pca: message.result[index],
            }));
          });
        }        
      } else if (message.func === "ml") {
        setNotificationText("Model Training Done! Going to Results Page...");
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
      {showNotification && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
        }}>
          <Notification
            radius="lg"
            title="Notifications"
            onClose={() => setShowNotification(false)}
            withCloseButton
          >
            {notificationText}
          </Notification>
        </div>
      )}
    </>
  );
}