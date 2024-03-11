"use client"

import { useContext } from "react";
import Table from "../../../components/ui-comps/PaginatedTables";
import LigandContext from "../../../context/LigandContext";
import { usePapaParse } from 'react-papaparse';

export default function TOC(){
    const { ligand } = useContext(LigandContext);
    const { jsonToCSV } = usePapaParse();

    const results = jsonToCSV(ligand, { delimiter: ',' });

    function downloadCSV(csv: any){
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
    
    return(
        <div className="tools-container">
            <button className="button" onClick={() => downloadCSV(results)}>Download Ligand Data as CSV</button>
            <Table data = {ligand} rowsPerPage={30}/>
        </div>
    )
}