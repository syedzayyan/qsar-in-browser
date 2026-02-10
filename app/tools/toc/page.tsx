"use client"

import { useContext, useEffect, useRef, useState } from "react";
import DataTable from "../../../components/ui-comps/PaginatedTables";
import LigandContext from "../../../context/LigandContext";
import { usePapaParse } from 'react-papaparse';
import TargetContext from "../../../context/TargetContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../components/tools/toolViz/DropDown";
import RDKitContext from "../../../context/RDKitContext";
import { Button, Group, Input } from "@mantine/core";

export default function TOC() {
    const { setLigand, ligand } = useContext(LigandContext);
    const { target } = useContext(TargetContext);
    const { rdkit } = useContext(RDKitContext);
    const { jsonToCSV } = usePapaParse();

    const inputRef = useRef(null);

    const [searchSmi, setSearchSmi] = useState('');
    const [searchRes, setSearchRes] = useState(ligand);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);


    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.value = searchSmi;
        }
    }, [searchSmi]);

    // CSV for download
    const results = jsonToCSV(ligand, { delimiter: ';' });

    function downloadCSV(csv: any) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'ligand_data.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function searchSubst() {
        const requestId = `fingerprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        rdkit.postMessage({
            function: 'substructure_search',
            id: requestId,
            ligand: ligand,
            searchSmi: searchSmi,
        });
        rdkit.onmessage = (event) => {
            if (event.data.id === requestId) {
                setSearchRes(event.data.results);
            }
        };
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

    return (
        <div className="tools-container">
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
                <Button onClick={searchSubst}>Substructure Search molecule</Button>
                <Button color="red" onClick={resetTable}>Reset</Button>
            </Group>

            <br />
            <Group>
                <Button onClick={() => downloadCSV(results)}>Download Ligand Data as CSV</Button>
                <Button color="red" onClick={deleteSelected}>Delete Selected Molecules</Button>
            </Group>

            <br /><br />
            <DataTable
                data={searchRes}
                rowsPerPage={30}
                act_column={target.activity_columns}
                selectable
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
            />


        </div>
    )
}
