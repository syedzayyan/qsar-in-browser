"use client"

import { useContext, useEffect, useRef, useState } from "react";
import DataTable from "../../../components/ui-comps/PaginatedTables";
import LigandContext from "../../../context/LigandContext";
import TargetContext from "../../../context/TargetContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../components/tools/toolViz/DropDown";
import RDKitContext from "../../../context/RDKitContext";
import {
  Button,
  Group,
  Input,
  Chip,
  Divider,
  Text,
  Loader,
  Stack,
  SimpleGrid,
  Paper,
} from "@mantine/core";

// All available physicochemical descriptor columns
const ALL_DESC_COLS = [
  {
    key: "MW",
    label: "MW (Da)",
    description:
      "Molecular Weight: The sum of atomic masses, dictating overall molecular size and influencing membrane permeability.",
  },
  {
    key: "LogP",
    label: "LogP",
    description:
      "Partition Coefficient: Measures the molecule's lipophilicity, predicting how easily it crosses cell membranes.",
  },
  {
    key: "HBA",
    label: "HBA",
    description:
      "Hydrogen Bond Acceptors: The count of nitrogen and oxygen atoms capable of accepting hydrogen bonds.",
  },
  {
    key: "HBD",
    label: "HBD",
    description:
      "Hydrogen Bond Donors: The count of nitrogen and oxygen atoms with attached hydrogens capable of donating hydrogen bonds.",
  },
  {
    key: "TPSA",
    label: "TPSA (Å²)",
    description:
      "Topological Polar Surface Area: The surface sum over polar atoms, critical for predicting intestinal absorption and blood-brain barrier penetration.",
  },
  {
    key: "RotBonds",
    label: "Rot. Bonds",
    description:
      "Rotatable Bonds: Measures molecular flexibility; high conformational flexibility can reduce oral bioavailability.",
  },
  {
    key: "Rings",
    label: "Rings",
    description:
      "Total Rings: The total number of cyclic structures, which contribute to structural rigidity and shape complementarity.",
  },
  {
    key: "AromaticRings",
    label: "Arom. Rings",
    description:
      "Aromatic Rings: Planar, conjugated ring systems that frequently drive pi-pi stacking interactions with target proteins.",
  },
  {
    key: "HeavyAtoms",
    label: "Heavy Atoms",
    description:
      "Heavy Atoms: The total count of non-hydrogen atoms, serving as a fundamental proxy for molecular size and complexity.",
  },
  {
    key: "Fsp3",
    label: "Fsp3",
    description:
      "Fraction of sp3 Carbons: The ratio of sp3-hybridized carbons to total carbons, indicating three-dimensional complexity and shapeliness.",
  },
];

const MINIMAL_KEYS = [];

type DescMap = Record<string, Record<string, number | null>>;

export default function TOC() {
  const { setLigand, ligand } = useContext(LigandContext);
  const { target } = useContext(TargetContext);
  const { rdkit } = useContext(RDKitContext);

  const inputRef = useRef(null);

  const [searchSmi, setSearchSmi] = useState('');
  const [searchRes, setSearchRes] = useState(ligand);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Physicochemical descriptors
  const [descMap, setDescMap] = useState<DescMap>({});
  const [visibleDescCols, setVisibleDescCols] = useState<string[]>(MINIMAL_KEYS);
  const [descLoading, setDescLoading] = useState(false);
  const descComputed = Object.keys(descMap).length > 0;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = searchSmi;
    }
  }, [searchSmi]);

  // Keep searchRes in sync when ligand changes (e.g. after delete)
  useEffect(() => {
    setSearchRes(ligand);
  }, [ligand]);

  function searchSubst() {
    const requestId = `substructure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const handler = (event: MessageEvent) => {
      if (event.data.id !== requestId) return;
      if (event.data.function !== 'substructure_search') return;
      rdkit.removeEventListener('message', handler);
      setSearchRes(event.data.results);
    };
    rdkit.addEventListener('message', handler);
    rdkit.postMessage({ function: 'substructure_search', id: requestId, ligand, searchSmi });
  }

  function calcDescriptors() {
    if (!rdkit) return;
    setDescLoading(true);
    const requestId = `physchem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const handler = (event: MessageEvent) => {
      if (event.data.id !== requestId) return;
      if (event.data.function !== 'physchem_descriptors') return;
      rdkit.removeEventListener('message', handler);
      const map: DescMap = {};
      for (const row of event.data.results) {
        const { id, ...rest } = row;
        map[id] = rest;
      }
      setDescMap(map);
      setDescLoading(false);
    };
    rdkit.addEventListener('message', handler);
    rdkit.postMessage({ function: 'physchem_descriptors', id: requestId, ligand });
  }

  function deleteSelected() {
    setLigand(prev => {
      const updated = prev.filter(mol => !selectedRows.includes(mol.id));
      setSearchRes(updated);
      return updated;
    });
    setSelectedRows([]);
  }

  function resetTable() {
    setSearchSmi('');
    setSearchRes(ligand);
    setSelectedRows([]);
  }

  function downloadCSV() {
    const colKeys = visibleDescCols.filter(k => descComputed);
    const actCols = target.activity_columns ?? [];

    const header = ["id", "canonical_smiles", ...actCols, ...colKeys].join(",");
    const rows = searchRes.map(mol => {
      const desc = descMap[mol.id] ?? {};
      const actVals = actCols.map(c => mol[c] ?? "");
      const descVals = colKeys.map(k => desc[k] ?? "");
      return [mol.id, `"${mol.canonical_smiles}"`, ...actVals, ...descVals].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "ligand_data.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Column labels for display in the table header
  const visibleDescDefs = ALL_DESC_COLS.filter(d => visibleDescCols.includes(d.key));

  return (
    <div className="tools-container">
      {/* Search row */}
      <Group>
        <Input
          ref={inputRef}
          className="input"
          type="text"
          placeholder="Search By Substructure/SMILES"
          value={searchSmi}
          onChange={(e) => setSearchSmi(e.target.value)}
        />
        <Dropdown buttonText="Draw the Molecule">
          <JSME width="400px" height="300px" onChange={(smiles) => setSearchSmi(smiles)} />
        </Dropdown>
        <Button onClick={searchSubst}>Substructure Search</Button>
        <Button color="red" variant="light" onClick={resetTable}>Reset</Button>
      </Group>

      <br />

      {/* Action row */}
      <Group>
        <Button onClick={downloadCSV}>Download CSV</Button>
        <Button color="red" onClick={deleteSelected} disabled={selectedRows.length === 0}>
          Delete Selected ({selectedRows.length})
        </Button>
        <Button
          color="teal"
          variant={descComputed ? "light" : "filled"}
          onClick={calcDescriptors}
          disabled={descLoading || ligand.length === 0}
          leftSection={descLoading ? <Loader size="xs" color="teal" /> : null}
        >
          {descComputed ? "Recalculate Descriptors" : "Click to Add Physicochemical Descriptors"}
        </Button>
      </Group>

      {/* Descriptor column picker — shown after calculation */}
      {descComputed && (
        <>
          <br />
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <Text size="sm" fw={600}>Visible Descriptors:</Text>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setVisibleDescCols(ALL_DESC_COLS.map(d => d.key))}
              >
                Show All
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => setVisibleDescCols([])}
              >
                Hide All
              </Button>
            </Group>

            <Chip.Group multiple value={visibleDescCols} onChange={setVisibleDescCols}>
              <Group gap="xs">
                {ALL_DESC_COLS.map(col => (
                  <Chip key={col.key} value={col.key} size="sm">
                    {col.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>

            {/* Educational Glossary Area */}
            {visibleDescCols.length > 0 && (
              <Paper mt="xs" p="sm" withBorder radius="sm">
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  mb="xs"
                  style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
                >
                  Descriptor Guide
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {ALL_DESC_COLS.filter((col) =>
                    visibleDescCols.includes(col.key),
                  ).map((col) => (
                    <Text key={col.key} size="xs" lh="1.4" c="dimmed">
                      <Text span fw={700} c="teal">
                        {col.label}:{" "}
                      </Text>
                      {col.description}
                    </Text>
                  ))}
                </SimpleGrid>
              </Paper>
            )}
          </Stack>
          <Divider my="sm" />
        </>
      )}

      <DataTable
        data={searchRes}
        rowsPerPage={30}
        act_column={target.activity_columns}
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        descMap={descMap}
        descColumns={visibleDescDefs.map(d => d.key)}
      />
    </div>
  );
}
