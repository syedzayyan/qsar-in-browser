import React, { useState } from "react";
import { Table, Paper, ScrollArea, Text, Group, Badge } from "@mantine/core";
import TableFooter from "./TableFooter";
import useTable from "../../hooks/useTable";
import MoleculeStructure from "../tools/toolComp/MoleculeStructure";
import { round } from "mathjs";

const DataTable = ({ data, rowsPerPage, act_column = [] }) => {
  const [page, setPage] = useState(1);
  const { slice, range } = useTable(data, page, rowsPerPage);

  return (
    <Paper
      shadow="md"
      radius="lg"
      p="md"
    >
      <ScrollArea>
        <Table
          highlightOnHover
          striped
          withColumnBorders
          horizontalSpacing="md"
          verticalSpacing="sm"
          style={{
            fontSize: "0.9rem",
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Text fw={600}>ID</Text>
              </Table.Th>
              <Table.Th>
                <Text fw={600}>SMILES</Text>
              </Table.Th>
              <Table.Th>
                <Text fw={600}>Structure</Text>
              </Table.Th>
              {act_column.map((el, i) => (
                <Table.Th key={i}>
                  <Text fw={600}>{el}</Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          <tbody>
            {slice.map((el, i) => (
              <Table.Tr key={i}>
                <Table.Td>
                  <Badge variant="light" color="blue">
                    {el.id}
                  </Badge>
                </Table.Td>

                <Table.Td style={{ maxWidth: 260 }}>
                  <Text size="sm" truncate>
                    {el.canonical_smiles}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Group justify="center">
                    <MoleculeStructure
                      structure={el.canonical_smiles}
                      id={i.toString()}
                    />
                  </Group>
                </Table.Td>

                {act_column.map((pl, j) => (
                  <Table.Td key={`${i}-${j}`}>
                    <Text ta="right">
                      {Number.isFinite(el[pl]) ? round(el[pl], 2) : "—"}
                    </Text>
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </tbody>
        </Table>
      </ScrollArea>

      <Group justify="center" mt="md">
        <TableFooter
          range={range}
          slice={slice}
          setPage={setPage}
          page={page}
        />
      </Group>
    </Paper>
  );
};

export default DataTable;
