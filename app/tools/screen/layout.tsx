"use client"
import { useContext, useState, createContext, useEffect } from "react";
import { Card, Button, Group, Text, Badge, Flex, Switch, Stack } from '@mantine/core';
import { IconUpload, IconDatabase, IconCpu2 } from '@tabler/icons-react';
import RDKitContext from "../../../context/RDKitContext";
import PyodideContext from "../../../context/PyodideContext";
import Loader from "../../../components/ui-comps/Loader";
import CSVLoader from "../../../components/dataloader/CSVLoader";
import NotificationContext from "../../../context/NotificationContext";
import TargetContext from "../../../context/TargetContext";
import Papa from 'papaparse';

export const ScreenDataContext = createContext([]);

export default function ScreenLayout({ children }) {
    const [loaded, setLoaded] = useState(true);
    const [screenData, setScreenData] = useState([]);
    const [broadLoading, setBroadLoading] = useState(false);
    const [autoRunML, setAutoRunML] = useState(true);  // NEW: Auto-run toggle
    const { pushNotification } = useContext(NotificationContext);
    const screenDataContextValue = screenData;

    const { rdkit } = useContext(RDKitContext);
    const { pyodide } = useContext(PyodideContext);
    const { target } = useContext(TargetContext);
    let newScreenData = screenData;

    // Load Broad + optional auto-ML
    const loadBroadDataset = async (autoML = false) => {
        setBroadLoading(true);
        pushNotification({ 
            message: `Loading Broad Hub ${autoML ? '+ Auto ML...' : '(4000 diverse)'}` 
        });

        try {
            const response = await fetch('/cleaned_compounds.csv');
            if (!response.ok) throw new Error('Failed to fetch Broad dataset');

            const csvText = await response.text();
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

            if (parsed.errors.length > 0) {
                throw new Error('CSV parse error');
            }

            const data: any[] = parsed.data
                .map((row: any) => ({
                    broad_id: row.broad_id || '',
                    name: row.name || '',
                    smiles: row.clean_smiles || row.canonical_smiles || '',
                    activity: 'Broad Hub'
                }))
                .filter(row => row.smiles);

            setScreenData(data);
            newScreenData = data;
            pushNotification({ message: `✅ Loaded ${data.length} Broad molecules!` });

            // AUTO-RUN ML if toggled
            if (autoML && data.length > 0) {
                setTimeout(() => callofScreenFunction({ smi_column: 'smiles' }), 500);
            }

        } catch (error) {
            pushNotification({ 
                message: `❌ Load failed: ${error.message}`, 
                type: 'error' 
            });
        } finally {
            setBroadLoading(false);
        }
    };

    async function callofScreenFunction(data) {
        pushNotification({ message: "Running ML Model on Ligands" });

        const workingData = [...newScreenData];
        workingData.forEach(obj => {
            obj["canonical_smiles"] = obj[data.smi_column];
            delete obj[data.smi_column];
        });

        const requestId = `ml_screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const inferenceType = target.machine_learning_inference_type;

        const rdkitHandler = (event) => {
            if (event.data.id !== requestId) return;
            if (event.data.function !== 'only_fingerprint') return;
            rdkit.removeEventListener('message', rdkitHandler);

            const mol_fp = event.data.results.map(x => x["fingerprint"]);

            const pyodideHandler = (event) => {
                if (event.data.success !== "ok") return;
                pyodide.removeEventListener('message', pyodideHandler);
                const fp_mols = event.data.results;
                const updated = workingData.map((x, i) => ({ ...x, predictions: fp_mols[i] }));
                setScreenData(updated);
                pushNotification({ message: "ML Model run complete" });
            };

            pyodide.addEventListener('message', pyodideHandler);
            pyodide.postMessage({
                id: requestId,
                opts: inferenceType === "regression" ? 1 : 2,
                fp: mol_fp,
                func: "ml-screen"
            });
        };

        rdkit.addEventListener('message', rdkitHandler);
        rdkit.postMessage({
            function: 'only_fingerprint',
            id: requestId,
            mol_data: workingData,
            formStuff: {
                fingerprint: localStorage.getItem("fingerprint"),
                radius: parseInt(localStorage.getItem("path")),
                nBits: parseInt(localStorage.getItem("nBits")),
            }
        });
    }

    if (!loaded) {
        return <Loader loadingText="Running ML Model on Ligands....." />;
    }

    return (
        <div className="tools-container">
            <ScreenDataContext.Provider value={screenDataContextValue}>
                <div style={{ height: "35vh", padding: '1rem' }}>
                    <Text size="lg" fw={500} mb="lg" ta="center">
                        Load Dataset → Run ML Screening
                    </Text>

                    <Group justify="center" gap="xl" wrap="wrap">
                        {/* CARD 1: CSV Upload */}
                        <Card shadow="sm" padding="lg" radius="md" w={400} withBorder>
                            <Card.Section inheritPadding py="xs">
                                <Flex justify="center" align="center" gap="xs">
                                    <IconUpload size={24} />
                                    <Text fw={500}>Upload CSV</Text>
                                </Flex>
                            </Card.Section>
                            <CSVLoader
                                callofScreenFunction={callofScreenFunction}
                                csvSetter={setScreenData}
                                act_col={false}
                            />
                        </Card>

                        {/* CARD 2: Broad Repurposing Hub */}
                        <Card shadow="sm" padding="lg" radius="md" w={400} withBorder>
                            <Card.Section inheritPadding py="xs" c="blue">
                                <Flex justify="center" align="center" gap="xs">
                                    <IconDatabase size={24} />
                                    <Text fw={500}>Broad Repurposing Hub</Text>
                                    <Badge size="sm" variant="light">7626 Compounds</Badge>
                                </Flex>
                            </Card.Section>
                            
                            <Stack gap="sm" justify="center" align="center">
                                <Button
                                    variant="light"
                                    size="lg"
                                    leftSection={<IconCpu2 size={20} />}
                                    onClick={() => loadBroadDataset(autoRunML)}
                                    loading={broadLoading}
                                    disabled={screenData.length > 0}
                                    fullWidth
                                >
                                    {broadLoading ? 'Loading...' : 'Load Broad Dataset'}
                                </Button>
                            </Stack>
                            
                            <Text size="sm" c="dimmed" ta="center" mt="xs">
                                Broad Institute • Canonical SMILES + broad_id
                            </Text>
                        </Card>
                    </Group>
                </div>

                {screenData.length > 0 && children}
            </ScreenDataContext.Provider>
        </div>
    )
}
