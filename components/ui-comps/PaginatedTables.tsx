import React, { useState } from "react";
import TableFooter from "./TableFooter";
import useTable from "../../hooks/useTable";
import MoleculeStructure from "../tools/toolComp/MoleculeStructure";
import { round } from "mathjs";

const Table = ({ data, rowsPerPage, act_column = [] }) => {
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
                        {act_column.map((el, i) => (
                            <th className="tableHeader" key={i}>{el}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {slice.map((el, i) => (
                        <tr className="tableRow" key={i}>
                            <td className="tableCell">{el.id}</td>
                            <td className="tableCell">{el.canonical_smiles}</td>
                            <td className="tableCell"><MoleculeStructure structure={el.canonical_smiles} id={i.toString()} /></td>
                            {act_column.map((pl, j) => (
                                <td className="tableCell" key={i+j}>{round(el[pl], 2)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <TableFooter range={range} slice={slice} setPage={setPage} page={page} />
        </>
    );
};

export default Table;