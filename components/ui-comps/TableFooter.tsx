import { Button, Group, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

const TableFooter = ({ range, setPage, page, slice }) => {
  const [visiblePages, setVisiblePages] = useState([]);

  useEffect(() => {
    if (slice.length < 1 && page !== 1) {
      setPage(page - 1);
    }
  }, [slice, page, setPage]);

  useEffect(() => {
    const visiblePageCount = 5;
    const startIndex = Math.max(1, page - Math.floor(visiblePageCount / 2));
    const endIndex = Math.min(range.length, startIndex + visiblePageCount - 1);

    const pages = [];
    for (let i = startIndex; i <= endIndex; i++) {
      pages.push(i);
    }

    setVisiblePages(pages);
  }, [range, page]);

  return (
    <Group justify="center" gap="xs">
      {/* First page */}
      {page > 1 && (
        <Button
          size="sm"
          variant="subtle"
          onClick={() => setPage(1)}
        >
          1
        </Button>
      )}

      {page > 2 && <Text size="sm">…</Text>}

      {/* Middle pages */}
      {visiblePages.map((el) => (
        <Button
          key={el}
          size="sm"
          variant={page === el ? "filled" : "subtle"}
          color={page === el ? "blue" : "gray"}
          onClick={() => setPage(el)}
        >
          {el}
        </Button>
      ))}

      {page < range.length - 1 && <Text size="sm">…</Text>}

      {/* Last page */}
      {page < range.length && (
        <Button
          size="sm"
          variant="subtle"
          onClick={() => setPage(range.length)}
        >
          {range.length}
        </Button>
      )}
    </Group>
  );
};

export default TableFooter;
