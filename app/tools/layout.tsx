"use client";
import { useContext, useEffect, useState } from "react";
import CornerMenu from "../../components/ui-comps/CornerMenu";
import PyodideContext from "../../context/PyodideContext";
import RDKitContext from "../../context/RDKitContext";
import LigandContext from "../../context/LigandContext";
import { useRouter } from "next/navigation";
import TargetContext from "../../context/TargetContext";
import { ErrorContextProvider } from "../../context/ErrorContext";
import Navbar from "../../components/ui-comps/Navbar"
import { AppShell, Burger, Flex, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Notification } from '@mantine/core';
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
  const { notifications, pushNotification, removeNotification } =
    useContext(NotificationContext);

  const router = useRouter();
  const [opened, { toggle }] = useDisclosure();

  useEffect(() => {
    const pyodideWorker = new Worker("/workers/pyodide.mjs", { type: "module" });
    const rdkitWorker = new Worker("/workers/rdkit.mjs");
    setRDKit(rdkitWorker);
    setPyodide(pyodideWorker);
  }, []);



  useEffect(() => {
    if (ligand.length > 1) {
      pushNotification({ "message": "Data Loading Done!" });
    }

  }, [ligand]);

  useEffect(() => {
    notifications.forEach((n) => {
      if (n.autoClose === false) return;

      const timeout = setTimeout(() => {
        removeNotification(n.id);
      }, n.duration ?? 5000);

      return () => clearTimeout(timeout);
    });
  }, [notifications]);


  if (rdkit) {
    rdkit.onmessage = (event) => {
      const { message, id, error, ...data } = event.data;

      // Handle simple string messages (progress, etc.)
      if (message && typeof message === 'string') {
        pushNotification({ message, autoClose: true, duration: 2000, id: id || undefined, type: 'info' });
        return;
      }

      // Handle errors
      if (error) {
        pushNotification({ id, message: `Error: ${error}`, type: 'error' });
        rdkit.terminate();
        return;
      }
      // Handle function results
      if (id && data.function) {

        switch (data.function) {
          case 'fingerprint':
            if (data.settings) {
              localStorage.setItem("fingerprint", data.settings.fingerprint);
              localStorage.setItem("path", data.settings.radius.toString());
              localStorage.setItem("nBits", data.settings.nBits.toString());
            }
            pushNotification({ id, message: "Molecule Pre-processing Done! Going to Activity Distribution Tool...", type: 'success' });
            setTimeout(() => {
              setLigand(data.data);
              setTarget({ ...target, activity_columns: data.activity_columns, pre_processed: true });
              router.push("/tools/activity");
            }, 200);
            break;

          case 'mma':
            pushNotification({ id, message: "Massive Molecular Analysis Done! Going to Scaffold Analysis Tool...", type: 'success', done: true });
            setTarget({ ...target, scaffCores: data.data });
            break;

          case 'tanimoto':
            pushNotification({ id, message: "Tanimoto Similarity Calculation Done!", type: 'success', done: true });
            setLigand(data.data);
            break;

          case 'only_fingerprint':
            setLigand(data.results);
            pushNotification({ id, message: "Fingerprints generated successfully!", type: 'success', done: true });
            break;

          case 'substructure_search':
            setLigand(data.results);
            pushNotification({ id, message: `Found ${data.results.length} matching substructures`, type: 'success', done: true });
            break;
          case 'scaffold_network':
            pushNotification({ id, message: "Scaffold Network Generation Done!", type: 'success', done: true });
            setTarget({ ...target, scaffold_network: data.data });
            break;
          default:
            console.warn('Unknown function:', data.function);
        }
      }
    };
  }


  if (pyodide) {
    pyodide.onmessage = (event) => {
      const message = event.data;
      if (typeof message === 'string') {
        pushNotification({ message: message });
      }
      if (message.func === "dim_red") {
        console.log(message);
        if (message.opts === 2 || message.opts === 3) {
          setTarget({ ...target, tsne_explained_variance: message.explained_variance });
          pushNotification({ id: message.id, message: "tSNE Processing Done!", type: 'success', done: true });
          setLigand((prevLigands) => {
            return prevLigands.map((ligand, index) => ({
              ...ligand,
              tsne: message.result[index],
            }));
          });
        } else {
          pushNotification({ id: message.id, message: "PCA Processing Done!", type: 'success', done: true });
          setTarget({ ...target, pca_explained_variance: message.explained_variance });
          setLigand((prevLigands) => {
            return prevLigands.map((ligand, index) => ({
              ...ligand,
              pca: message.result[index],
            }));
          });
        }
      } else if (message.func === "ml") {
        pushNotification({ id: message.id, message: "Model Training Done! Going to Results Page...", type: 'success', done: true });
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

      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 1000,
        }}
      >
        {notifications.map((n) => (
          <Notification
            key={n.id}
            radius="lg"
            color={n.type === 'error' ? 'red' : n.type || 'blue'}  //
            withCloseButton
            onClose={() => removeNotification(n.id)}
          >
            {n.message}
          </Notification>
        ))}
      </div>

    </>
  );
}