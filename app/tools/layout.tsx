"use client";

import { useContext, useEffect, useRef } from "react";
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
      .filter((n) => n.autoClose !== false)
      .map((n) =>
        setTimeout(() => removeNotification(n.id), n.duration ?? 5000),
      );
    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  // ── RDKit onmessage ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rdkit) return;

    rdkit.onmessage = (event: MessageEvent) => {
      const payload = event.data;
      const { message, id, error, ...data } = payload;

      // ── Classical ML screening ───────────────────────────────────────────
      if (payload.function === "only_fingerprint") {
        const validMols = (payload.results ?? []).filter(
          (x: any) => x?.fingerprint != null,
        );

        if (validMols.length === 0) {
          pushNotification({
            message: "No valid fingerprints generated",
            type: "error",
          });
          return;
        }

        const aligned = validMols.map(
          (x: any) =>
            (payload.mol_data ?? []).find(
              (m: any) => m.canonical_smiles === x.canonical_smiles,
            ) ?? x,
        );

        const pyodideWorker = new Worker("/workers/pyodide.mjs", {
          type: "module",
        });

        pyodideWorker.postMessage({
          id: `ml_screen_${Date.now()}`,
          func: "ml_screen",
          fp: validMols.map((x: any) => x.fingerprint),
          opts:
            targetRef.current.machine_learning_inference_type === "regression"
              ? 1
              : 2,
          params: {
            model:
              targetRef.current.machine_learning_inference_type === "regression"
                ? 1
                : 2,
          },
          _aligned: aligned,
        });

        pyodideWorker.onmessage = (evt: MessageEvent) => {
          const msg = evt.data;
          if (!msg.id?.startsWith("ml_screen_")) return;

          if (!msg.ok) {
            pushNotification({
              message: `ML error: ${msg.error}`,
              type: "error",
            });
            pyodideWorker.terminate();
            return;
          }

          const fp_mols: any[] = msg.result;
          const alignedMols: any[] = msg._aligned ?? screenDataRef.current;

          const updated = alignedMols.map((x: any, i: number) => ({
            ...x,
            predictions: fp_mols[i],
          }));
          const sorted = [...updated].sort(
            (a, b) => Number(b.predictions) - Number(a.predictions),
          );
          const computedPreds = sorted
            .map((x) => {
              const p = x.predictions;
              if (Array.isArray(p))
                return p.length === 2
                  ? p[1] > 0.5
                    ? 1.0
                    : 0.0
                  : p.indexOf(Math.max(...p));
              return p;
            })
            .filter((p) => p !== null);

          setScreenData(updated);
          setSortedScreenData(sorted);
          setPreds(computedPreds);
          pushNotification({
            message: `ML complete — ${updated.length} molecules scored`,
            type: "success",
          });
          pyodideWorker.terminate();
        };

        return;
      }

      // ── DMPNN training epoch ─────────────────────────────────────────────
      if (payload.function === "dmpnn_train_epoch") {
        const { epoch, total_epochs, avg_loss, fold } = payload;
        setDmpnnLossHistory((prev) => [...prev, { epoch, avg_loss, fold }]);

        if (fold === null && epoch === total_epochs) {
          setDmpnnTraining(false);
          setDmpnnWeightsReady(true);
          pushNotification({
            message: `Training complete! Final loss: ${avg_loss.toFixed(4)}`,
            type: "success",
            id: "dmpnn_train",
            done: true,
            autoClose: true,
          });
        }
        return;
      }

      // ── DMPNN one-off inference ──────────────────────────────────────────
      if (payload.function === "dmpnn_infer_one") {
        setDmpnnOneOffResult(payload.result);
        return;
      }

      // ── DMPNN weights download ───────────────────────────────────────────
      if (payload.function === "dmpnn_get_weights") {
        const bytes: Uint8Array = payload.bytes;
        const blob = new Blob([bytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dmpnn_weights.safetensors";
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (payload.function === "dmpnn_kfold_complete") {
        const { metric1, metric2, per_fold_preds } = payload;
        setDmpnnTraining(false);
        setDmpnnWeightsReady(true);
        // Shape matches target.machine_learning so MLLayout visualisations
        // (DiscreteScatterplot, FoldMetricBarplot) work without any changes
        setTarget((prev) => ({
          ...prev,
          machine_learning: [metric1, metric2, per_fold_preds],
        }));
        pushNotification({
          message: `K-fold CV complete! Mean loss: ${(metric1.reduce((a: number, b: number) => a + b, 0) / metric1.length).toFixed(4)}`,
          type: "success",
          id: "dmpnn_kfold",
          done: true,
          autoClose: true,
        });
        return;
      }
      if (payload.function === "dmpnn_infer_batch") {
        const results: number[] = payload.results; // array of predictions
        const aligned: any[] = payload.mol_data;

        const updated = aligned.map((x, i) => ({
          ...x,
          predictions: results[i],
        }));
        const sorted = [...updated].sort(
          (a, b) => Number(b.predictions) - Number(a.predictions),
        );
        const computedPreds = sorted
          .map((x) => x.predictions)
          .filter((p) => p !== null);

        setScreenData(updated);
        setSortedScreenData(sorted);
        setPreds(computedPreds);
        pushNotification({
          message: `D-MPNN screening complete — ${updated.length} molecules scored`,
          type: "success",
        });
        return;
      }

      // ── GA progress ──────────────────────────────────────────────────────
      if (payload.type === "ga_progress") {
        setGAState((prev) => ({
          ...prev,
          gen: payload.gen,
          bestScore: payload.best,
          bestSmiles: payload.bestSmiles ?? prev.bestSmiles,
        }));
        return;
      }

      // ── GA complete ──────────────────────────────────────────────────────
      if (payload.ok === true) {
        setGAState((prev) => ({
          ...prev,
          isRunning: false,
          population: payload.result?.population ?? [],
          scores: payload.result?.scores ?? [],
        }));
        return;
      }

      // ── GA error ─────────────────────────────────────────────────────────
      if (payload.error && !data.function) {
        setGAState((prev) => ({ ...prev, isRunning: false }));
        pushNotification({
          message: `GA Error: ${payload.error}`,
          type: "error",
        });
        return;
      }

      // ── Simple string notification ───────────────────────────────────────
      if (message && typeof message === "string") {
        pushNotification({
          message,
          autoClose: true,
          duration: 2000,
          id: id ?? undefined,
          type: "info",
        });
        return;
      }

      // ── Worker-level error ───────────────────────────────────────────────
      if (error) {
        pushNotification({ id, message: `Error: ${error}`, type: "error" });
        rdkit.terminate();
        return;
      }

      // ── Named function responses ─────────────────────────────────────────
      if (id && data.function) {
        switch (data.function) {
          case "fingerprint":
            if (data.settings) {
              localStorage.setItem("fingerprint", data.settings.fingerprint);
              localStorage.setItem("path", data.settings.radius.toString());
              localStorage.setItem("nBits", data.settings.nBits.toString());
            }
            pushNotification({
              id,
              message:
                "Molecule Pre-processing Done! Going to Activity Distribution Tool...",
              type: "success",
            });
            setTimeout(() => {
              setLigand(data.data);
              setTarget({
                ...targetRef.current,
                activity_columns: data.activity_columns,
                pre_processed: true,
              });
              router.push("/tools/activity");
            }, 200);
            break;

          case "mma":
            pushNotification({
              id,
              message:
                "Massive Molecular Analysis Done! Going to Scaffold Analysis Tool...",
              type: "success",
              done: true,
            });
            setTarget({ ...targetRef.current, scaffCores: data.data });
            break;

          case "tanimoto":
            pushNotification({
              id,
              message: "Tanimoto Similarity Calculation Done!",
              type: "success",
              done: true,
            });
            setLigand(data.data);
            break;

          case "substructure_search":
            setLigand(data.results);
            pushNotification({
              id,
              message: `Found ${data.results.length} matching substructures`,
              type: "success",
              done: true,
            });
            break;

          case "scaffold_network":
            pushNotification({
              id,
              message: "Scaffold Network Generation Done!",
              type: "success",
              done: true,
            });
            setTarget({ ...targetRef.current, scaffold_network: data.data });
            break;

          default:
            console.warn("Unknown function:", data.function);
        }
      }
    };
  }, [rdkit]);

  // ── Pyodide onmessage ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!pyodide) return;

    pyodide.onmessage = (event: MessageEvent) => {
      const message = event.data;

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
