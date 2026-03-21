"use client"
import { useContext, useState } from "react";
import { Card, Button, Group, Text, Badge, Flex, Stack } from '@mantine/core';
import { IconUpload, IconDatabase, IconCpu2 } from '@tabler/icons-react';
import RDKitContext from "../../../context/RDKitContext";
import CSVLoader from "../../../components/dataloader/CSVLoader";
import NotificationContext from "../../../context/NotificationContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import DataTable2 from "../../../components/ui-comps/PaginatedTables2";
import Papa from 'papaparse';
import { useMLResults } from "../../../context/MLResultsContext";

export default function Screen() {
    const { screenData, setScreenData, sortedScreenData, preds } = useMLResults();
    const [broadLoading, setBroadLoading] = useState(false);

    const { pushNotification } = useContext(NotificationContext);
    const { rdkit } = useContext(RDKitContext);

    const loadBroadDataset = async () => {
        setBroadLoading(true);
        pushNotification({ message: `Loading Broad Hub...` });

        try {
            const response = await fetch('/cleaned_compounds.csv');
            if (!response.ok) throw new Error('Failed to fetch Broad dataset');

            const csvText = await response.text();
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            if (parsed.errors.length > 0) throw new Error('CSV parse error');

            const data: any[] = parsed.data
                .map((row: any) => ({
                    broad_id: row.broad_id || '',
                    name: row.name || '',
                    canonical_smiles: row.clean_smiles || row.canonical_smiles || '',
                    activity: 'Broad Hub'
                }))
                .filter(row => row.canonical_smiles);

            setScreenData(data);
            pushNotification({ message: `✅ Loaded ${data.length} Broad molecules!` });
            setTimeout(() => callofScreenFunction(data), 500);
        } catch (error) {
            pushNotification({ message: `❌ Load failed: ${error.message}`, type: 'error' });
        } finally {
            setBroadLoading(false);
        }
    };

    function callofScreenFunction(data: any[], smi_column = "canonical_smiles") {
        pushNotification({ message: "Running ML Model on Ligands" });

        // normalise smiles key to canonical_smiles
        const normalised = data.map(obj => {
            if (smi_column !== "canonical_smiles") {
                const { [smi_column]: smiles, ...rest } = obj;
                return { ...rest, canonical_smiles: smiles };
            }
            return obj;
        });

        setScreenData(normalised);

        rdkit.postMessage({
            function: 'only_fingerprint',
            id: `ml_screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            mol_data: normalised,
            formStuff: {
                fingerprint: localStorage.getItem("fingerprint"),
                radius: parseInt(localStorage.getItem("path")),
                nBits: parseInt(localStorage.getItem("nBits")),
            }
        });
    }

    const downloadCsv = () => {
        const csvContent =
            "data:text/csv;charset=utf-8," +
            sortedScreenData.map(row => Object.values(row).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="tools-container">
            <div style={{ height: "35vh", padding: '1rem' }}>
                <Text size="lg" fw={500} mb="lg" ta="center">
                    Load Dataset → Run ML Screening
                </Text>

                <Group justify="center" gap="xl" wrap="wrap">
                    <Card shadow="sm" padding="lg" radius="md" w={400} withBorder>
                        <Card.Section inheritPadding py="xs">
                            <Flex justify="center" align="center" gap="xs">
                                <IconUpload size={24} />
                                <Text fw={500}>Upload CSV</Text>
                            </Flex>
                        </Card.Section>
                        <CSVLoader
                            callofScreenFunction={(opts) => callofScreenFunction(screenData, opts.smi_column)}
                            csvSetter={setScreenData}
                            act_col={false}
                        />
                    </Card>

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
                                onClick={loadBroadDataset}
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

            {sortedScreenData.length > 0 && sortedScreenData[0].predictions !== undefined && (
                <>
                    <Histogram data={preds} />
                    <br />
                    <button className="button" onClick={downloadCsv}>
                        Download Predictions in CSV Format
                    </button>
                    &nbsp;
                    <DataTable2
                        data={sortedScreenData}
                        rowsPerPage={5}
                        act_column={["predictions"]}
                        onSelectionChange={() => { }}
                        checkboxExistence={false}
                    />
                </>
            )}
        </div>
    );
}