"use client"

import { useContext, useEffect, useRef, useState } from "react";
import Table from "../../../components/ui-comps/PaginatedTables";
import LigandContext from "../../../context/LigandContext";
import { usePapaParse } from 'react-papaparse';
import TargetContext from "../../../context/TargetContext";
import JSME from "../../../components/tools/toolViz/JSMEComp";
import Dropdown from "../../../components/tools/toolViz/DropDown";
import RDKitContext from "../../../context/RDKitContext";
import { isEmpty } from "lodash";

export default function TOC() {
    const { ligand } = useContext(LigandContext);
    const { target } = useContext(TargetContext);
    const { jsonToCSV } = usePapaParse();
    const { rdkit } = useContext(RDKitContext);
    const inputRef = useRef(null);

    const [searchSmi, setSearchSmi] = useState('');
    const [searchRes, setSearchRes] = useState(ligand);

    useEffect(() => {
        if (inputRef.current) {
          inputRef.current.value = searchSmi;
        }
      }, [searchSmi]);

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
        let searchResults = [];
        let query = rdkit.get_mol(searchSmi);
        ligand.map((lig) => {
            let mol = rdkit.get_mol(lig.canonical_smiles);
            let substructRes = mol.get_substruct_match(query);
            var substructResJson = JSON.parse(substructRes);
            if (!isEmpty(substructResJson)){
                searchResults.push(lig);
            }
            mol.delete();
        })
        query.delete();
        setSearchRes(searchResults);
    }


    return (
        <div className="tools-container">
            <div >
                <button className="button" onClick={() => downloadCSV(results)}>Download Ligand Data as CSV</button>
                <br />
                <input ref={inputRef} className = "input" type="text" placeholder="Search By Substructure/SMILES" onChange={(e) => setSearchSmi(e.target.value)}/>
                &nbsp;
                <Dropdown buttonText="Draw the molecule">
                    <JSME width="300px" height="300px" onChange={(smiles) => setSearchSmi(smiles)} id="jsme_comp_2" />
                </Dropdown> 
                &nbsp;
                <button className="button" onClick={() => searchSubst()}>Substructure Search molecule</button>               
            </div>
            <Table data={searchRes} rowsPerPage={30} act_column={target.activity_columns} />
        </div>
    )
}