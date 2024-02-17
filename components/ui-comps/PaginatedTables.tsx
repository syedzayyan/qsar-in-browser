import React, { useState } from "react";
import TableFooter from "./TableFooter";
import useTable from "../../hooks/useTable";
import MoleculeStructure from "../tools/toolComp/MoleculeStructure";
import { randomInt } from "mathjs";

const Table = ({ data, rowsPerPage }) => {
    const [page, setPage] = useState(1);
    const { slice, range } = useTable(data, page, rowsPerPage);
    return (
        <>
            <table className="table">
                <thead className="tableRowHeader">
                    <tr>
                        <th className="tableHeader">ID</th>
                        <th className="tableHeader">SMILES</th>
                        <th className="tableHeader">Representation</th>
                        <th className="tableHeader">Prediction</th>
                    </tr>
                </thead>
                <tbody>
                    {slice.map((el, i) => (
                        <tr className="tableRowItems" key={randomInt(0, 100000000)}>
                            <td className="tableCell">{el.id}</td>
                            <td className="tableCell">{el.canonical_smiles}</td>
                            <td className="tableCell"><MoleculeStructure structure={el.canonical_smiles} id = {i.toString()}/></td>
                            <td className="tableCell">{el.predictions}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <TableFooter range={range} slice={slice} setPage={setPage} page={page} />
        </>
    );
};

export default Table;