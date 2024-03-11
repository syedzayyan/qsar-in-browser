import React, { useState } from "react";
import MoleculeStructure from "./MoleculeStructure";
import Card from "../toolViz/Card";

const GraphComponent: React.FC<any> = ({ graph }) => {
    const nodesPerPage = 12; // Adjust as needed
    const [currentPage, setCurrentPage] = useState(1);

    const nodesArray: { node: any, smiles: string, size: number }[] = [];

    graph.forEachNode((node, attributes) => {
        nodesArray.push({ node, smiles: attributes.smiles, size: attributes.molCounts });
    });

    nodesArray.sort((a, b) => b.size - a.size);

    const totalPages = Math.ceil(nodesArray.length / nodesPerPage);

    const getDisplayedPages = () => {
        const range = 2; // Adjust as needed
        const displayedPages: number[] = [];
        let start = Math.max(1, currentPage - range);
        let end = Math.min(currentPage + range, totalPages);

        if (currentPage - start < range) {
            end = Math.min(end + range - (currentPage - start), totalPages);
        }

        if (end - currentPage < range) {
            start = Math.max(1, start - (range - (end - currentPage)));
        }

        for (let i = start; i <= end; i++) {
            displayedPages.push(i);
        }

        return displayedPages;
    };

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div>
            <div className="container-for-cards">
                {nodesArray
                    .slice((currentPage - 1) * nodesPerPage, currentPage * nodesPerPage)
                    .map(({ node, smiles, size }) => (
                        <Card key={node}>
                            <p>Node ID: {node}</p>
                            <MoleculeStructure structure={smiles} id={node} />
                            <p>Scaffold Matches: {size}</p>
                        </Card>

                    ))}
            </div>
            <div>
                <button className={`tableButton ${currentPage === 1 ? "activeButton" : "inactiveButton"}`} disabled={currentPage === 1} onClick={() => handlePageChange(1)}>
                    First Page
                </button>........
                {getDisplayedPages().map((pageNumber) => (
                    <button
                        className={`tableButton ${currentPage === pageNumber ? "activeButton" : "inactiveButton"}`}
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        disabled={pageNumber === currentPage}

                    >
                        {pageNumber}
                    </button>
                ))}.......
                <button
                    className={`tableButton ${currentPage === totalPages ? "activeButton" : "inactiveButton"}`}
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(totalPages)}
                >
                    Last Page
                </button>
            </div>
        </div>
    );
};

export default GraphComponent;
