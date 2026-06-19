"use client";
import { useContext, useEffect, useRef, useState } from "react";
import CornerMenu from "../../components/ui-comps/CornerMenu";
import PyodideContext from "../../context/PyodideContext";
import RDKitContext from "../../context/RDKitContext";
import LigandContext from "../../context/LigandContext";
import { useRouter } from "next/navigation";
import TargetContext from "../../context/TargetContext";
import { ErrorContextProvider } from "../../context/ErrorContext";
import Navbar from "../../components/ui-comps/Navbar";
import { AppShell, Burger, Flex, Group, Notification } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import NotificationContext from "../../context/NotificationContext";
import { GAContextProvider, useGAContext } from "../../context/GAContext";
import {
  MLResultsContextProvider,
  useMLResults,
} from "../../context/MLResultsContext";

// ── Inner — has access to GAContext + MLResultsContext ────────────────────────
function DashboardInner({ children }: { children: React.ReactNode }) {
  const { setLigand, ligand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);
  const { pyodide } = useContext(PyodideContext);
  const { rdkit } = useContext(RDKitContext);
  const { notifications, pushNotification, removeNotification } =
    useContext(NotificationContext);
  const { setGAState } = useGAContext();
  const {
    setScreenData,
    setSortedScreenData,
    setPreds,
    screenData,
    setDmpnnLossHistory,
    setDmpnnTraining,
    setDmpnnOneOffResult,
    setDmpnnWeightsReady,
    classicalModelReady,
    setClassicalModelReady,
  } = useMLResults();

  const screenDataRef = useRef<any[]>([]);
  useEffect(() => {
    screenDataRef.current = screenData;
  }, [screenData]);

  const router = useRouter();
  const [opened, { toggle }] = useDisclosure();

  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    if (ligand.length > 1) pushNotification({ message: "Data Loading Done!" });
  }, [ligand]);

  useEffect(() => {
    const timers = notifications
      .filter(n => n.autoClose !== false)
      .map(n => setTimeout(() => removeNotification(n.id), n.duration ?? 5000));
    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  // ── RDKit onmessage ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rdkit) return;

  // Keep a ref to the latest handler logic so the stable addEventListener closure always calls current values.
  const rdkitHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  rdkitHandlerRef.current = (event: MessageEvent) => {
    const { message, id, error, ...data } = event.data;

    if (message && typeof message === 'string') {
      pushNotification({ message, autoClose: true, duration: 2000, id: id || undefined, type: 'info' });
      return;
    }

    if (error) {
      pushNotification({ id, message: `Error: ${error}`, type: 'error' });
      rdkit.terminate?.();
      return;
    }

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
            setTarget(prev => ({ ...prev, activity_columns: data.activity_columns, pre_processed: true }));
            router.push("/tools/activity");
          }, 200);
          break;

        case 'mma':
          pushNotification({ id, message: "Massive Molecular Analysis Done! Going to Scaffold Analysis Tool...", type: 'success', done: true });
          setTarget(prev => ({ ...prev, scaffCores: data.data }));
          break;

        case 'tanimoto':
          pushNotification({ id, message: "Tanimoto Similarity Calculation Done!", type: 'success', done: true });
          setLigand(data.data);
          break;

        case 'scaffold_network':
          pushNotification({ id, message: "Scaffold Network Generation Done!", type: 'success', done: true });
          setTarget(prev => ({ ...prev, scaffold_network: data.data }));
          break;

        case 'physchem_descriptors':
        case 'only_fingerprint':
          // handled locally by individual pages via addEventListener
          break;

        default:
          console.warn('Unknown function:', data.function);
      }
    }
  };

  useEffect(() => {
    if (!rdkit?.addEventListener) return;
    const handler = (event: MessageEvent) => rdkitHandlerRef.current?.(event);
    rdkit.addEventListener('message', handler);
    return () => rdkit.removeEventListener('message', handler);
  }, [rdkit]);


  const pyodideHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  pyodideHandlerRef.current = (event: MessageEvent) => {
    const message = event.data;
    if (typeof message === 'string') {
      pushNotification({ message });
      return;
    }
    if (message.func === "dim_red") {
      if (message.opts === 2 || message.opts === 3) {
        setTarget(prev => ({ ...prev, tsne_explained_variance: message.explained_variance }));
        pushNotification({ id: message.id, message: "tSNE Processing Done!", type: 'success', done: true });
        setLigand(prevLigands => prevLigands.map((ligand, index) => ({
          ...ligand,
          tsne: message.result[index],
        })));
      } else {
        pushNotification({ id: message.id, message: "PCA Processing Done!", type: 'success', done: true });
        setTarget(prev => ({ ...prev, pca_explained_variance: message.explained_variance }));
        setLigand(prevLigands => prevLigands.map((ligand, index) => ({
          ...ligand,
          pca: message.result[index],
        })));
      }
    } else if (message.func === "ml") {
      pushNotification({ id: message.id, message: "Model Training Done! Going to Results Page...", type: 'success', done: true });
      setTarget(prev => ({ ...prev, machine_learning: message.results }));
    }
    // ml-screen and other local operations are handled by their respective pages
  };

  useEffect(() => {
    if (!pyodide?.addEventListener) return;
    const handler = (event: MessageEvent) => pyodideHandlerRef.current?.(event);
    pyodide.addEventListener('message', handler);
    return () => pyodide.removeEventListener('message', handler);
  }, [pyodide]);

      if (typeof message === "string") {
        pushNotification({ message });
        return;
      }

      if (message.func === "dim_red") {
        if (message.opts === 2 || message.opts === 3) {
          setTarget({
            ...targetRef.current,
            tsne_explained_variance: message.explained_variance,
          });
          pushNotification({
            id: message.id,
            message: "tSNE Processing Done!",
            type: "success",
            done: true,
          });
          setLigand((prev) =>
            prev.map((lig, i) => ({ ...lig, tsne: message.result[i] })),
          );
        } else {
          pushNotification({
            id: message.id,
            message: "PCA Processing Done!",
            type: "success",
            done: true,
          });
          setTarget({
            ...targetRef.current,
            pca_explained_variance: message.explained_variance,
          });
          setLigand((prev) =>
            prev.map((lig, i) => ({ ...lig, pca: message.result[i] })),
          );
        }
        return;
      }

      if (message.func === "ml") {
        pushNotification({
          id: message.id,
          message: "Model Training Done! Going to Results Page...",
          type: "success",
          done: true,
        });
        setTarget({ ...targetRef.current, machine_learning: message.results });
        setClassicalModelReady(true); // ← add this
      }
    };
  }, [pyodide]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <AppShell
        padding="md"
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: "sm",
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
          <AppShell.Main>{children}</AppShell.Main>
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
            color={n.type === "error" ? "red" : (n.type ?? "blue")}
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

// ── Outer — boots workers, owns GAContextProvider ─────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setPyodide } = useContext(PyodideContext);
  const { setRDKit } = useContext(RDKitContext);

  useEffect(() => {
    const pyodideWorker = new Worker("/workers/pyodide.mjs", {
      type: "module",
    });
    const rdkitWorker = new Worker("/workers/rdkit.mjs");

    setRDKit(rdkitWorker);
    setPyodide(pyodideWorker);

    return () => {
      pyodideWorker.terminate();
      rdkitWorker.terminate();
    };
  }, []);

  return (
    <GAContextProvider>
      <MLResultsContextProvider>
        <DashboardInner>{children}</DashboardInner>
      </MLResultsContextProvider>
    </GAContextProvider>
  );
}
