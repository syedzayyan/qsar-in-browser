import { useContext, useState, useEffect, useRef, useCallback } from "react";
import LigandContext from "../../../context/LigandContext";
import { Button, Card, Grid, Modal, Loader, Text, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import TargetContext from "../../../context/TargetContext";
import RDKitContext from "../../../context/RDKitContext";
import { round } from "mathjs";
import NotificationContext from "../../../context/NotificationContext";
import { rdkitRpc, rdkitRequestId } from "../../../components/utils/rdkit_rpc";
import useTable from "../../../hooks/useTable";
import TableFooter from "../../ui-comps/TableFooter";

const CARD_WIDTH = 250;
const CARD_HEIGHT = 200;
const CARDS_PER_PAGE = 12;
// Stable fallback reference - `?? []` would otherwise allocate a new empty
// array every render, and useTable's effect depends on its `data` argument
// by reference, so a fresh array each render re-fires it forever.
const EMPTY_CORES: any[] = [];

type SvgItem = { key: string; structure: string; subStructure?: string };

// Batch-renders molecule SVGs in the RDKit worker instead of each card
// loading its own RDKit instance and drawing on the main thread (which is
// what made Common Motifs struggle once there were many cards on screen).
function useMoleculeSvgs(rdkit: any, items: SvgItem[]) {
  const [svgs, setSvgs] = useState<Record<string, string | null>>({});
  const cacheRef = useRef<Record<string, string | null>>({});
  const itemsKey = items.map((it) => `${it.key}::${it.structure}::${it.subStructure ?? ""}`).join("|");

  useEffect(() => {
    if (!rdkit || items.length === 0) return;
    const missing = items.filter((it) => !(it.key in cacheRef.current));
    if (missing.length === 0) return;

    let cancelled = false;
    const id = rdkitRequestId("render_svgs");
    rdkitRpc(
      rdkit,
      {
        function: "render_svgs",
        id,
        items: missing.map((it) => ({ id: it.key, structure: it.structure, subStructure: it.subStructure })),
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      },
      "render_svgs",
    )
      .then((data) => {
        if (cancelled) return;
        const next = { ...cacheRef.current };
        for (const r of data.results) next[r.id] = r.svg;
        cacheRef.current = next;
        setSvgs(next);
      })
      .catch((e) => console.error("render_svgs failed:", e));

    return () => {
      cancelled = true;
    };
    // itemsKey captures everything items would - avoids re-fetching on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdkit, itemsKey]);

  return svgs;
}

function MoleculeSvgCard({ svg }: { svg: string | null | undefined }) {
  if (svg === undefined) {
    return (
      <Group justify="center" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
        <Loader size="sm" />
      </Group>
    );
  }
  if (svg === null) {
    return (
      <Group justify="center" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
        <Text size="xs" c="dimmed">Render error.</Text>
      </Group>
    );
  }
  return (
    <div
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function MMA() {
  const { ligand } = useContext(LigandContext);
  // If your TargetContext exposes setTarget, this will update the global target.
  // If not, `setTarget` will be undefined and we fallback to local loaded flag.
  const { target, setTarget } = useContext(TargetContext);
  const { rdkit } = useContext(RDKitContext);
  const [opened, { open, close }] = useDisclosure(false);
  const [scaffCoreLoaded, setScaffCoresLoaded] = useState(false);
  const [specificMolArray, setSpecificMolArray] = useState([]);
  const [page, setPage] = useState(1);
  const [modalPage, setModalPage] = useState(1);
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
        // scaffoldArrayGetter's processScaffoldResults posts
        // { id, function: 'mma', data: [filteredArrayOfScaffolds, massive_array] }
        if (data.function === "mma" && data.data) {
          if (typeof setTarget === "function") {
            setTarget(prev => ({ ...prev, scaffCores: data.data }));
          } else if (mounted.current) {
            setScaffCoresLoaded(true);
          }

          // clear current request id
          currentRequestId.current = null;
        }
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
    setModalPage(1);
    open();
  }

  const isRunning = notifications.some(n => n.id.startsWith("mma_") && !n.done);

  const allCores = target?.scaffCores?.[0] ?? EMPTY_CORES;
  const { slice: pageCores, range: coresRange } = useTable(allCores, page, CARDS_PER_PAGE);
  const { slice: pageMatched, range: matchedRange } = useTable(specificMolArray, modalPage, CARDS_PER_PAGE);

  const coreSvgs = useMoleculeSvgs(
    rdkit,
    pageCores.map((cores) => ({ key: cores[0], structure: cores[0] })),
  );
  const matchedSvgs = useMoleculeSvgs(
    rdkit,
    pageMatched.map((cores) => ({ key: `${cores[0]}::${cores[1]}`, structure: cores[0], subStructure: cores[1] })),
  );

  if (scaffCoreLoaded) {
    return (
      <div className="main-container">
        <Grid grow>
          {pageCores.map((cores, key) => (
            <Grid.Col span={4} key={key}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <MoleculeSvgCard svg={coreSvgs[cores[0]]} />
                <br />
                <span>Count : {cores[1][0]}</span>
                <br />
                <br />
                <Button onClick={() => scaffoldFinder(cores[0])}>Matched Molecules</Button>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        <Group justify="center" mt="md">
          <TableFooter range={coresRange} slice={pageCores} setPage={setPage} page={page} />
        </Group>

        <Modal opened={opened} onClose={close} size="75rem">
          <Grid grow>
            {pageMatched.map((cores, key) => (
              <Grid.Col key={key} span={4}><Card key={key}>
                <MoleculeSvgCard svg={matchedSvgs[`${cores[0]}::${cores[1]}`]} />
                <br />
                <span>{target.activity_columns[0]} : {round(cores[4], 2)}</span>
              </Card>
              </Grid.Col>
            ))}
          </Grid>
          <Group justify="center" mt="md">
            <TableFooter range={matchedRange} slice={pageMatched} setPage={setModalPage} page={modalPage} />
          </Group>
        </Modal>
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
