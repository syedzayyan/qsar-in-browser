import { useContext, useState, useEffect, useRef, useCallback } from "react";
import LigandContext from "../../../context/LigandContext";
import MoleculeStructure from "./MoleculeStructure";
import { Button, Card, Grid, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import TargetContext from "../../../context/TargetContext";
import RDKitContext from "../../../context/RDKitContext";
import { round } from "mathjs";
import NotificationContext from "../../../context/NotificationContext";

export default function MMA() {
  const { ligand } = useContext(LigandContext);
  // If your TargetContext exposes setTarget, this will update the global target.
  // If not, `setTarget` will be undefined and we fallback to local loaded flag.
  const { target, setTarget } = useContext(TargetContext);
  const { rdkit } = useContext(RDKitContext);
  const [opened, { open, close }] = useDisclosure(false);
  const [scaffCoreLoaded, setScaffCoresLoaded] = useState(false);
  const [specificMolArray, setSpecificMolArray] = useState([]);
  const currentRequestId = useRef(null);
  const mounted = useRef(true);
  const prevOnMessage = useRef(null);
  const { notifications, pushNotification } = useContext(NotificationContext);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // derive loaded from target so navigating back doesn't show loader if target already has results
  useEffect(() => {
    if (target && Array.isArray(target.scaffCores) && target.scaffCores.length > 0) {
      setScaffCoresLoaded(true);
    } else {
      setScaffCoresLoaded(false);
    }
  }, [target]);

  // worker message handling using rdkit.onmessage (since rdkit is a real Worker)
  useEffect(() => {
    if (!rdkit) return;

    // preserve any existing onmessage handler to restore on cleanup
    prevOnMessage.current = rdkit.onmessage;

    function handleMessage(event) {
      const data = event.data || {};
      // ignore unrelated messages
      if (!data.id) return;

      // only accept responses meant for the current request
      if (currentRequestId.current && data.id === currentRequestId.current) {
        // expected shape: { id, function, result } - adjust to your worker's shape
        const result = data.result ?? data; // adapt as needed

        // If context setter exists, update shared target
        if (typeof setTarget === "function") {
          // Merge scaffCores into target - adjust field name to your shape
          setTarget(prev => ({ ...prev, scaffCores: result.scaffCores ?? result }));
        } else {
          // fallback: set local loaded flag. You might want to store result locally if needed.
          if (mounted.current) {
            setScaffCoresLoaded(true);
          }
        }

        // clear current request id
        currentRequestId.current = null;
      }
    }

    // attach handler
    rdkit.onmessage = handleMessage;

    // cleanup - restore previous handler to avoid clobbering other users of the worker
    return () => {
      try {
        rdkit.onmessage = prevOnMessage.current || null;
      } catch (err) {
        // ignore if worker already terminated
      }
    };
  }, [rdkit, setTarget]);

  const mmaRunner = useCallback(() => {
    
    if (!rdkit) return;

    const requestId = `mma_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    currentRequestId.current = requestId;
    pushNotification({ message: "Running Matched Molecular Analysis...", id: requestId, done: false, autoClose: false });
    // optimistic UX: mark as not loaded while running (target-derived effect will override if context already had results)
    setScaffCoresLoaded(false);

    rdkit.postMessage({
      function: "mma",
      id: requestId,
      mol_data: ligand,
      activity_columns: target?.activity_columns ?? [],
      formStuff: null,
    });
  }, [rdkit, ligand, target]);

  function scaffoldFinder(cores) {
    if (!target || !target.scaffCores) return;
    // your original selection logic
    const selectedArrays = target.scaffCores[1].filter((array) => array[1] === cores);
    setSpecificMolArray(selectedArrays);
    open();
  }

  const isRunning = notifications.some(n => n.id.startsWith("mma_") && !n.done);

  if (scaffCoreLoaded) {
    return (
      <div className="main-container">
        <Grid grow>
          {target.scaffCores[0].map((cores, key) => (
            <Grid.Col span={4} key={key}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <MoleculeStructure structure={cores[0]} id={cores[0]} svgMode />
                <br />
                <span>Count : {cores[1][0]}</span>
                <br />
                <br />
                <Button onClick={() => scaffoldFinder(cores[0])}>Matched Molecules</Button>
              </Card>
            </Grid.Col>
          ))}

          <Modal opened={opened} onClose={close} size="75rem">
            <Grid grow>
              {specificMolArray.map((cores, key) => (
                <Grid.Col key={key} span={4}><Card key={key}>
                  <MoleculeStructure
                    structure={cores[0]}
                    subStructure={cores[1]}
                    id={cores[0]}
                    svgMode
                  />
                  <br />
                  <span>{target.activity_columns[0]} : {round(cores[4], 2)}</span>
                </Card>
                </Grid.Col>
              ))}
            </Grid>
          </Modal>
        </Grid>
      </div>
    );
  } else {
    return (
      <div className="main-container">
        <Button disabled={isRunning} onClick={mmaRunner}>{isRunning ? "Running Matched Molecular Analysis..." : "Run Matched Molecular Analysis"}</Button>
      </div>
    );
  }
}
