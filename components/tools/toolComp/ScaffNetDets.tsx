import React, { useState, useEffect } from "react";
import TagComponent from "../../ui-comps/Tags";
import ScaffoldNetworkWholeGraph from "./ScaffoldNetworkWholeGraph";
import { useDisclosure } from "@mantine/hooks";
import { Button, Card, Grid, Group, Modal } from "@mantine/core";
import { ScaffoldGraph } from "../../../types/GraphData";

const GraphComponent: React.FC<any> = ({ graph }) => {
    const [opened, { open, close }] = useDisclosure(false);

    // Function to get nodes connected to a specific label in the graph
    function getNodesConnectedToLabel(graph: ScaffoldGraph, label: string) {
        return graph.edges
            .filter(e => e.label === label)
            .map(e => parseInt(e.source));
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
    const [nodesArray, setNodesArray] = useState<{ node: any, smiles: string, size: number, img: string }[]>([]);
    const [displayNodesArray, setDisplayNodesArray] = useState<{ node: any, smiles: string, size: number, img: string }[]>([]);

    // Effect to update nodesArray and displayNodesArray when graph changes
    useEffect(() => {
        const tempNodesArray = graph.nodes.map(node => ({
            node: node.id,
            smiles: node.smiles,
            size: node.molCounts,
            img: node.image,
        }));
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
    function getSubgraph(graph: ScaffoldGraph, nodeIds: string[]): ScaffoldGraph {
        const nodeIdSet = new Set(nodeIds);
        return {
            nodes: graph.nodes.filter(n => nodeIdSet.has(n.id)),
            edges: graph.edges.filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)),
        };
    }
    // In filterNodes function:
    function filterNodes(nodeEnquired: string, attr, depthSet: number) {
        // Get neighbors (nodes connected to this node)
        const connectedNodeIds = new Set([nodeEnquired]);
        graph.edges.forEach(edge => {
            if (edge.source === nodeEnquired) connectedNodeIds.add(edge.target);
            if (edge.target === nodeEnquired) connectedNodeIds.add(edge.source);
        });

        const filteredGraph = getSubgraph(graph, Array.from(connectedNodeIds));
        setGraph(filteredGraph);
        open();
    }

    return (
        <div>
            {/* Component for filtering tags */}
            <TagComponent tags={['All', 'Fragment', 'Generic', 'GenericBond', 'RemoveAttachment', 'Initialize']} onClick={(tags) => { updateFilterFragments(tags) }}></TagComponent>

            {/* Container for displaying cards */}
            <Grid>
                {displayNodesArray
                    .slice((currentPage - 1) * nodesPerPage, currentPage * nodesPerPage)
                    .map(({ node, smiles, size, img }) => (
                        <Grid.Col span={4}>
                            <Card key={node} shadow="sm" padding="lg" radius="md" withBorder>
                                <p>Node ID: {node}</p>
                                <img src={img} alt={smiles} />
                                <p>Scaffold Matches: {size}</p>
                                <Button onClick={() => filterNodes(node, "attr", 3)}>Neighbour Nodes</Button>
                            </Card>
                        </Grid.Col>
                    ))}
            </Grid>

            <Modal opened={opened} onClose={close} size="75rem">
                <div>
                    <h2>Neighbouring Nodes</h2>
                    {opened &&
                        <ScaffoldNetworkWholeGraph graph={subGraph} imageSize={300} height={500} />
                    }
                </div>
            </Modal>

            <br />
            <Group>
                <Button className={`tableButton ${currentPage === 1 ? "activeButton" : "inactiveButton"}`} disabled={currentPage === 1} onClick={() => handlePageChange(1)}>
                    First Page
                </Button>
                {getDisplayedPages().map((pageNumber) => (
                    <Button
                        className={`tableButton ${currentPage === pageNumber ? "activeButton" : "inactiveButton"}`}
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        disabled={pageNumber === currentPage}
                    >
                        {pageNumber}
                    </Button>
                ))}
                <Button
                    className={`tableButton ${currentPage === totalPages ? "activeButton" : "inactiveButton"}`}
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(totalPages)}
                >
                    Last Page
                </Button>
            </Group>
        </div>
    );
};

export default GraphComponent;
