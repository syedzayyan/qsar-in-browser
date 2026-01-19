import React, { useState, useEffect } from "react";
import { Table, Paper, ScrollArea, Text, Group, Badge, Checkbox } from "@mantine/core";
import TableFooter from "./TableFooter";
import useTable from "../../hooks/useTable";
import MoleculeStructure from "../tools/toolComp/MoleculeStructure";
import { round } from "mathjs";

const DataTable = ({
  data,
  rowsPerPage,
  act_column = [],
  selectable = false,
  onSelectionChange,
}) => {
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const { slice, range } = useTable(data, page, rowsPerPage);


  const toggleRow = (sliceIndex: number) => {
    const globalIndex = (page - 1) * rowsPerPage + sliceIndex;

    setSelectedRows(prev => {
      const next = prev.includes(globalIndex)
        ? prev.filter(i => i !== globalIndex)
        : [...prev, globalIndex];

      // 🔑 notify parent ONLY here (user action)
      onSelectionChange?.(next);

      return next;
    });
  };
  const pageIndices = slice.map(
    (_, i) => (page - 1) * rowsPerPage + i
  );


  return (
    <Paper shadow="md" radius="lg" p="md">
      <ScrollArea>
        <Table
          highlightOnHover
          striped
          withColumnBorders
          horizontalSpacing="md"
          verticalSpacing="sm"
          style={{ fontSize: "0.9rem" }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Checkbox
                  checked={pageIndices.every(i => selectedRows.includes(i))}
                  indeterminate={
                    pageIndices.some(i => selectedRows.includes(i)) &&
                    !pageIndices.every(i => selectedRows.includes(i))
                  }
                  onChange={() => {
                    setSelectedRows(prev => {
                      const allSelected = pageIndices.every(i => prev.includes(i));

                      const next = allSelected
                        ? prev.filter(i => !pageIndices.includes(i))
                        : [...new Set([...prev, ...pageIndices])];

                      onSelectionChange?.(next);
                      return next;
                    });
                  }}
                />
              </Table.Th>
              <Table.Th><Text fw={600}>ID</Text></Table.Th>
              <Table.Th><Text fw={600}>SMILES</Text></Table.Th>
              <Table.Th><Text fw={600}>Structure</Text></Table.Th>
              {act_column.map((el, i) => (
                <Table.Th key={i}><Text fw={600}>{el}</Text></Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          <tbody>
            {slice.map((el, i) => (
              <Table.Tr key={i}>
                {selectable && (
                  <Table.Td>
                    <Checkbox
                      checked={selectedRows.includes((page - 1) * rowsPerPage + i)}
                      onChange={() => toggleRow(i)}
                    />

                  </Table.Td>
                )}

                <Table.Td>
                  <Badge variant="light" color="blue">{el.id}</Badge>
                </Table.Td>

                <Table.Td style={{ maxWidth: 260 }}>
                  <Text size="sm" truncate>{el.canonical_smiles}</Text>
                </Table.Td>

                <Table.Td>
                  <Group justify="center">
                    <MoleculeStructure structure={el.canonical_smiles} id={i.toString()} />
                  </Group>
                </Table.Td>

                {act_column.map((pl, j) => (
                  <Table.Td key={`${i}-${j}`}>
                    <Text ta="right">{Number.isFinite(el[pl]) ? round(el[pl], 2) : "—"}</Text>
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </tbody>
        </Table>
      </ScrollArea>

      <Group justify="center" mt="md">
        <TableFooter range={range} slice={slice} setPage={setPage} page={page} />
      </Group>
    </Paper>
  );
};

export default DataTable;
