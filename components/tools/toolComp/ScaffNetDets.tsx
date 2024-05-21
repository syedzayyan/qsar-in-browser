import React, { useState, useEffect } from "react";
import MoleculeStructure from "./MoleculeStructure";
import Card from "../toolViz/Card";
import TagComponent from "../../ui-comps/Tags";
import ModalComponent from "../../ui-comps/ModalComponent";
import { subgraph } from "graphology-operators";
import ScaffoldNetworkWholeGraph from "./ScaffoldNetworkWholeGraph";

const GraphComponent: React.FC<any> = ({ graph }) => {
    const [modalState, setModalState] = useState(false);

    // Function to get nodes connected to a specific label in the graph
    function getNodesConnectedToLabel(graph, label) {
        const nodes = [];
        graph.forEachEdge((_, attributes, source, target) => {
            if (attributes.label === label) {
                nodes.push(parseInt(source));
            }
        });
        return nodes;
    }

    // Update the display nodes array based on selected tags
    function updateFilterFragments(tags: string) {
        if (tags !== 'All') {
            const nodesConnectedToConnectionLabel = getNodesConnectedToLabel(graph, tags);
            const newDisplayArray = nodesConnectedToConnectionLabel.map(index => nodesArray[index]);
            setDisplayNodesArray(newDisplayArray);
        } else {
            setDisplayNodesArray(nodesArray);
        }
    }
    
    // State declarations
    const [currentPage, setCurrentPage] = useState(1);
    const [nodesArray, setNodesArray] = useState<{ node: any, smiles: string, size: number }[]>([]);
    const [displayNodesArray, setDisplayNodesArray] = useState<{ node: any, smiles: string, size: number }[]>([]);

    // Effect to update nodesArray and displayNodesArray when graph changes
    useEffect(() => {
        const tempNodesArray: { node: any, smiles: string, size: number }[] = [];
        graph.forEachNode((node, attributes) => {
            tempNodesArray.push({ node, smiles: attributes.smiles, size: attributes.molCounts });
        });
        tempNodesArray.sort((a, b) => b.size - a.size);
        setNodesArray(tempNodesArray);
        setDisplayNodesArray(tempNodesArray);
    }, [graph]);

    // Constants for pagination
    const nodesPerPage = 12; // Adjust as needed
    const totalPages = Math.ceil(displayNodesArray.length / nodesPerPage);

    // Function to get displayed page numbers
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

    // Function to handle page change
    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const [subGraph, setGraph] = useState<any>();
    function filterNodes(nodeEnquired: string, attr, depthSet: number) {
        let filteredGraph = subgraph(graph, [nodeEnquired, ...graph.neighbors(nodeEnquired)]);;
        setGraph(filteredGraph);
        setModalState(true);
    }

    return (
        <div>
            {/* Component for filtering tags */}
            <TagComponent tags={['All', 'Fragment', 'Generic', 'GenericBond', 'RemoveAttachment', 'Initialize']} onClick={(tags) => { updateFilterFragments(tags) }}></TagComponent>

            {/* Container for displaying cards */}
            <div className="container-for-cards">
                {displayNodesArray
                    .slice((currentPage - 1) * nodesPerPage, currentPage * nodesPerPage)
                    .map(({ node, smiles, size }) => (
                        <Card key={node}>
                            <p>Node ID: {node}</p>
                            <MoleculeStructure structure={smiles} id={node} />
                            <p>Scaffold Matches: {size}</p>
                            <button className="button" onClick={() => filterNodes(node, "attr", 3)}>Neighbour Nodes</button>
                        </Card>
                    ))}
            </div>

            <ModalComponent isOpen = {modalState} closeModal={() => setModalState(false)} card = {false}>
                <div>
                    <h2>Neighbouring Nodes</h2>
                    {modalState && 
                        <ScaffoldNetworkWholeGraph graph={subGraph} imageSize={300} height={500} /> 
                    }  
                </div>
                  
            </ModalComponent>

            {/* Pagination buttons */}
            <div>
                <button className={`tableButton ${currentPage === 1 ? "activeButton" : "inactiveButton"}`} disabled={currentPage === 1} onClick={() => handlePageChange(1)}>
                    First Page
                </button>
                {getDisplayedPages().map((pageNumber) => (
                    <button
                        className={`tableButton ${currentPage === pageNumber ? "activeButton" : "inactiveButton"}`}
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        disabled={pageNumber === currentPage}
                    >
                        {pageNumber}
                    </button>
                ))}
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
