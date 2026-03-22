"use client"
import { useContext, useState, useMemo } from "react";
import { Card, Button, Group, Text, Badge, Flex, Stack, Paper, NumberInput } from '@mantine/core';
import { IconUpload, IconDatabase, IconCpu2 } from '@tabler/icons-react';
import RDKitContext from "../../../context/RDKitContext";
import CSVLoader from "../../../components/dataloader/CSVLoader";
import NotificationContext from "../../../context/NotificationContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import DataTable2 from "../../../components/ui-comps/PaginatedTables2";
import Papa from 'papaparse';
import { useMLResults } from "../../../context/MLResultsContext";
import { readFpSettingsAsFormStuff } from "../../../components/utils/get_fp_settings";
import PieChart from "../../../components/tools/toolViz/PieChart";
import TargetContext from "../../../context/TargetContext";


export default function Screen() {
    const {
        screenData, setScreenData,
        sortedScreenData, setSortedScreenData,
        preds, setPreds,
        screenThreshold, setScreenThreshold,
    } = useMLResults();

    const [broadLoading, setBroadLoading] = useState(false);
    const { pushNotification } = useContext(NotificationContext);
    const { rdkit } = useContext(RDKitContext);

    const { target } = useContext(TargetContext);
    const isClassification = target.machine_learning_inference_type === "classification";

    // ── Pie chart data derived from sortedScreenData + threshold ──
    const pieData = useMemo(() => {
        const withPreds = sortedScreenData.filter(r => r.predictions !== undefined);
        if (withPreds.length === 0) return [];
        const active = withPreds.filter(r => r.predictions![0] >= screenThreshold).length;
        const inactive = withPreds.length - active;
        return [
            { key: `Active (≥ ${screenThreshold})`, value: active },
            { key: `Inactive (< ${screenThreshold})`, value: inactive },
        ];
    }, [sortedScreenData, screenThreshold]);

    const activeCount = pieData[0]?.value ?? 0;
    const inactiveCount = pieData[1]?.value ?? 0;
    const total = pieData.reduce((s, d) => s + d.value, 0);

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
        const normalised = data.map(obj => {
            if (smi_column !== "canonical_smiles") {
                const { [smi_column]: smiles, ...rest } = obj;
                return { ...rest, canonical_smiles: smiles };
            }
            return obj;
        });
        setScreenData(normalised);
        rdkit.postMessage({
            function: "only_fingerprint",
            id: `ml_screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            mol_data: normalised,
            formStuff: readFpSettingsAsFormStuff(),
        });
    }

    const downloadCsv = () => {
        if (sortedScreenData.length === 0) return;
        const headers = Object.keys(sortedScreenData[0]).filter(k => k !== 'fingerprint');
        const rows = sortedScreenData.map(row =>
            headers.map(h => {
                const v = row[h];
                return Array.isArray(v) ? v.join(';') : (v ?? '');
            }).join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "screen_predictions.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const hasPredictions = sortedScreenData.length > 0 && sortedScreenData[0].predictions !== undefined;

    return (
        <div className="tools-container">
            <div style={{ padding: '1rem' }}>
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

            {hasPredictions && preds.length > 0 && (
                <>
                    {/* ── Threshold + Pie ── */}
                    <Paper withBorder p="md" radius="md" mb="md" mx="md">
                        <Group align="flex-start" gap="xl" wrap="wrap">
                            {isClassification && pieData.length > 0 && (
                                <Group align="center" gap="xl">
                                    <Stack gap="xs">
                                        <Text fw={600} size="sm">Classification Threshold</Text>
                                        <Text size="xs" c="dimmed">
                                            predictions[0] ≥ threshold → <Badge color="green" size="xs" component="span">Active</Badge>
                                            {" "}— below → <Badge color="red" size="xs" component="span">Inactive</Badge>
                                        </Text>
                                        <NumberInput
                                            value={screenThreshold}
                                            onChange={(v) => setScreenThreshold(typeof v === 'number' ? v : 0.5)}
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            decimalScale={2}
                                            style={{ width: 160 }}
                                        />
                                    </Stack>
                                    <PieChart data={pieData} width={200} height={200} />
                                    <Stack gap={6}>
                                        <Group gap={6}>
                                            <Badge color="green" variant="filled">{activeCount}</Badge>
                                            <Text size="sm">Active ({total > 0 ? ((activeCount / total) * 100).toFixed(1) : 0}%)</Text>
                                        </Group>
                                        <Group gap={6}>
                                            <Badge color="red" variant="filled">{inactiveCount}</Badge>
                                            <Text size="sm">Inactive ({total > 0 ? ((inactiveCount / total) * 100).toFixed(1) : 0}%)</Text>
                                        </Group>
                                        <Text size="xs" c="dimmed">Total: {total} compounds</Text>
                                        {Math.abs(activeCount - inactiveCount) / total > 0.3 && (
                                            <Text size="xs" c="orange">⚠ Imbalanced predictions</Text>
                                        )}
                                    </Stack>
                                </Group>
                            )}

                            {!isClassification && preds.length > 0 && (
                                <Histogram data={preds} />
                            )}
                        </Group>
                    </Paper>

                    {/* ── Table & Download ── */}
                    <br />
                    <Button onClick={downloadCsv}>
                        Download Predictions in CSV Format
                    </Button>
                    &nbsp;
                    <DataTable2
                        data={sortedScreenData.map(row => ({
                            ...row,
                            id: row.id ?? row.drugbank_id ?? row.broad_id ?? row.name ?? '—',
                            ...(isClassification ? {
                                prob_active: row.predictions?.[0] ?? null,
                                prob_inactive: row.predictions?.[1] ?? null,
                                predicted_class: (row.predictions?.[0] ?? 0) >= screenThreshold ? 'Active' : 'Inactive',
                            } : {
                                predicted_value: row.predictions?.[0] ?? null,
                            }),
                        }))}
                        rowsPerPage={5}
                        act_column={isClassification
                            ? ["prob_active", "prob_inactive", "predicted_class"]
                            : ["predictions"]
                        }
                        onSelectionChange={() => { }}
                        checkboxExistence={false}
                    />
                </>
            )}
        </div>
    );
}