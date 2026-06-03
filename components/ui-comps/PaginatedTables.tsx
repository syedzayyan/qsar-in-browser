import React, { useEffect, useState } from "react";
import {
  Table,
  Paper,
  ScrollArea,
  Text,
  Group,
  Badge,
  Checkbox,
} from "@mantine/core";
import TableFooter from "./TableFooter";
import useTable from "../../hooks/useTable";
import MoleculeStructure from "../tools/toolComp/MoleculeStructure";
import { round } from "mathjs";

type DescMap = Record<string, Record<string, number | null>>;

type DataTableProps = {
  data: any[];
  rowsPerPage: number;
  act_column?: string[];
  selectable?: boolean;
  selectedRows: string[];
  onSelectionChange?: (ids: string[]) => void;
  checkboxExistence?: boolean;
  descMap?: DescMap;
  // keys into descMap — the column header shown is the key itself (keep it short/readable)
  descColumns?: string[];
};

const DataTable = ({
  data,
  rowsPerPage,
  act_column = [],
  selectable = false,
  selectedRows,
  onSelectionChange,
  checkboxExistence = true,
  descMap = {},
  descColumns = [],
}: DataTableProps) => {
  const [page, setPage] = useState(1);
  const { slice, range } = useTable(data, page, rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [data]);

  const pageIds = slice.map(el => el.id);

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = selectedRows.includes(id)
      ? selectedRows.filter(x => x !== id)
      : [...selectedRows, id];
    onSelectionChange(next);
  };

  const togglePage = () => {
    if (!onSelectionChange) return;
    const allSelected = pageIds.every(id => selectedRows.includes(id));
    const next = allSelected
      ? selectedRows.filter(id => !pageIds.includes(id))
      : [...new Set([...selectedRows, ...pageIds])];
    onSelectionChange(next);
  };

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
              {checkboxExistence && selectable && (
                <Table.Th>
                  <Checkbox
                    checked={pageIds.length > 0 && pageIds.every(id => selectedRows.includes(id))}
                    indeterminate={
                      pageIds.some(id => selectedRows.includes(id)) &&
                      !pageIds.every(id => selectedRows.includes(id))
                    }
                    onChange={togglePage}
                  />
                </Table.Th>
              )}

              <Table.Th><Text fw={600}>ID</Text></Table.Th>
              <Table.Th><Text fw={600}>SMILES</Text></Table.Th>
              <Table.Th><Text fw={600}>Structure</Text></Table.Th>

              {act_column.map((el, i) => (
                <Table.Th key={i}>
                  <Text fw={600}>{el}</Text>
                </Table.Th>
              ))}

              {descColumns.map(col => (
                <Table.Th key={col}>
                  <Text fw={600}>{col}</Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          <tbody>
            {slice.map((el, i) => {
              const desc = descMap[el.id] ?? {};
              return (
                <Table.Tr key={el.id ?? `row-${page}-${i}`}>
                  {selectable && (
                    <Table.Td>
                      <Checkbox
                        checked={selectedRows.includes(el.id)}
                        onChange={() => toggleRow(el.id)}
                      />
                    </Table.Td>
                  )}

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
                        id={el.id}
                      />
                    </Group>
                  </Table.Td>

                  {act_column.map((pl, j) => (
                    <Table.Td key={`${el.id}-act-${j}`}>
                      <Text ta="right">
                        {Number.isFinite(el[pl]) ? round(el[pl], 2) : "—"}
                      </Text>
                    </Table.Td>
                  ))}

                  {descColumns.map(col => (
                    <Table.Td key={`${el.id}-desc-${col}`}>
                      <Text ta="right">
                        {desc[col] != null ? desc[col] : "—"}
                      </Text>
                    </Table.Td>
                  ))}
                </Table.Tr>
              );
            })}
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
