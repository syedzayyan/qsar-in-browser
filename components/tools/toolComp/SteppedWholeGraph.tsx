import React, {
  useContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  Image,
  Text,
  Badge,
  rem,
  Paper,
  Group,
  ScrollArea,
  Stack,
  Button,
  useMantineTheme,
  useMantineColorScheme,
  ActionIcon,
} from '@mantine/core';
import {
  IconChevronRight,
  IconRefresh,
  IconArrowBarToLeft,
} from '@tabler/icons-react';
import TargetContext from '../../../context/TargetContext';

const ScaffoldNetworkTreeView = ({
  imageSize = 120,
  graph = null,
  reverse = true,
}) => {
  const { target } = useContext(TargetContext);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const graphData = graph || target?.scaffold_network || { nodes: [], edges: [] };

  /* -----------------------------
   * Scroll ref
   * ----------------------------- */
  const scrollViewportRef = useRef(null);

  const scrollToStart = () => {
    scrollViewportRef.current?.scrollTo({
      left: 0,
      behavior: 'smooth',
    });
  };

  const scrollToEnd = () => {
    if (!scrollViewportRef.current) return;
    scrollViewportRef.current.scrollTo({
      left: scrollViewportRef.current.scrollWidth,
      behavior: 'smooth',
    });
  };

  /* -----------------------------
   * Build graph indices
   * ----------------------------- */
  const { nodeMap, childrenOf, parentsOf, incomingEdgeTypes } = useMemo(() => {
    const nodeMap = {};
    const childrenOf = {};
    const parentsOf = {};
    const incomingEdgeTypes = {};

    graphData.nodes.forEach((n) => {
      nodeMap[n.id] = n;
      childrenOf[n.id] = [];
      parentsOf[n.id] = [];
      incomingEdgeTypes[n.id] = [];
    });

    graphData.edges.forEach((e) => {
      childrenOf[e.source]?.push(e.target);
      parentsOf[e.target]?.push(e.source);
      incomingEdgeTypes[e.target]?.push(e.label);
    });

    return { nodeMap, childrenOf, parentsOf, incomingEdgeTypes };
  }, [graphData]);

  /* -----------------------------
   * Semantic label
   * ----------------------------- */
  const nodeSemantic = useCallback(
    (nodeId) => {
      const edges = incomingEdgeTypes[nodeId] || [];
      if (!edges.length) return 'Root';

      const hasGeneric = edges.some((e) => e.startsWith('Generic'));
      const hasFragment = edges.includes('Fragment');

      if (hasGeneric && hasFragment) return 'Mixed';
      if (hasGeneric) return 'Generic';
      if (hasFragment) return 'Fragment';
      return 'Derived';
    },
    [incomingEdgeTypes]
  );

  /* -----------------------------
   * Entry nodes
   * ----------------------------- */
  const entryNodeIds = useMemo(() => {
    return graphData.nodes
      .filter((n) =>
        reverse
          ? (childrenOf[n.id] || []).length === 0
          : (parentsOf[n.id] || []).length === 0
      )
      .map((n) => n.id);
  }, [graphData, childrenOf, parentsOf, reverse]);

  /* -----------------------------
   * State
   * ----------------------------- */
  const [columns, setColumns] = useState([]);
  const [activePath, setActivePath] = useState([]);

  useEffect(() => {
    setColumns(entryNodeIds.length ? [entryNodeIds] : []);
    setActivePath([]);
    scrollToStart();
  }, [entryNodeIds]);

  /* -----------------------------
   * Expand logic
   * ----------------------------- */
  const handleNodeClick = useCallback(
    (nodeId, columnIndex) => {
      const nextNodes = reverse
        ? parentsOf[nodeId] || []
        : childrenOf[nodeId] || [];

      if (!nextNodes.length) return;

      setColumns((prev) => {
        const next = prev.slice(0, columnIndex + 1);
        next[columnIndex + 1] = nextNodes;
        return [...next];
      });

      setActivePath((prev) =>
        prev.slice(0, columnIndex).concat(nodeId)
      );

      // Auto-scroll to the right
      setTimeout(() => scrollToEnd(), 50);
    },
    [childrenOf, parentsOf, reverse]
  );

  /* -----------------------------
   * Reset
   * ----------------------------- */
  const resetView = () => {
    setColumns(entryNodeIds.length ? [entryNodeIds] : []);
    setActivePath([]);
    scrollToStart();
  };

  /* -----------------------------
   * Node card
   * ----------------------------- */
  const NodeCard = ({ node, columnIndex }) => {
    const ref = useRef(null);

    const hasNext = reverse
      ? (parentsOf[node.id] || []).length > 0
      : (childrenOf[node.id] || []).length > 0;

    const isActive = activePath[columnIndex] === node.id;

    useEffect(() => {
      if (isActive && ref.current) {
        ref.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }, [isActive]);

    return (
      <Paper
        ref={ref}
        withBorder
        p="xs"
        radius="md"
        style={{
          cursor: hasNext ? 'pointer' : 'default',
          minWidth: rem(180),
          borderColor: isActive
            ? theme.colors[theme.primaryColor][6]
            : undefined,
          background:
            isActive && colorScheme === 'dark'
              ? theme.colors.dark[6]
              : isActive
                ? theme.colors.blue[0]
                : undefined,
        }}
        onClick={() => hasNext && handleNodeClick(node.id, columnIndex)}
      >
        <Group justify="space-between">
          <Image
            src={node.image}
            width={imageSize * 0.5}
            height={imageSize * 0.5}
            fit="contain"
          />
          {hasNext && <IconChevronRight size={16} />}
        </Group>

        <Stack gap={4} mt="xs">

          <Text size="xs" lineClamp={2}>
            {node.smiles}
          </Text>
          <Stack gap={4} mt="xs">
            <Badge size="xs" variant="light">
              {nodeSemantic(node.id)}
            </Badge>
            {node.molCounts !== undefined && (

              <Badge size="xs" variant="light">
                # Match {node.molCounts}
              </Badge>
            )}</Stack>
        </Stack>
      </Paper>
    );
  };

  /* -----------------------------
   * Render
   * ----------------------------- */
  return (
    <>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          {/* Scroll left */}
          <ActionIcon
            variant="light"
            onClick={() =>
              scrollViewportRef.current?.scrollBy({ left: -200, behavior: 'smooth' })
            }
            title="Scroll left"
          >
            <IconArrowBarToLeft size={16} />
          </ActionIcon>

          {/* Scroll right */}
          <ActionIcon
            variant="light"
            onClick={() =>
              scrollViewportRef.current?.scrollBy({ left: 200, behavior: 'smooth' })
            }
            title="Scroll right"
          >
            <IconChevronRight size={16} />
          </ActionIcon>

          <Text size="xs" c="dimmed">
            Cores → Leaves
          </Text>
        </Group>

        <Button
          size="xs"
          variant="light"
          leftSection={<IconRefresh size={14} />}
          onClick={resetView}
        >
          Reset
        </Button>
      </Group>


      <ScrollArea
        viewportRef={scrollViewportRef}
        type="scroll"
        scrollHideDelay={0}
        offsetScrollbars
        style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}
      >
        <Group align="flex-start" wrap="nowrap" gap="sm" px="sm">
          {columns.map((nodeIds, columnIndex) => {
            const activeId = activePath[columnIndex];
            const sortedByMolCounts = [...nodeIds].sort((a, b) => {
              const ma = nodeMap[a]?.molCounts ?? -Infinity;
              const mb = nodeMap[b]?.molCounts ?? -Infinity;
              return mb - ma; // descending (highest first)
            });

            const ordered = activeId
              ? [activeId, ...sortedByMolCounts.filter((id) => id !== activeId)]
              : sortedByMolCounts;


            return (
              <Stack key={columnIndex} gap="xs">
                {ordered.map((id) => (
                  <NodeCard
                    key={id}
                    node={nodeMap[id]}
                    columnIndex={columnIndex}
                  />
                ))}
              </Stack>
            );
          })}
        </Group>
      </ScrollArea>
    </>
  );
};

export default ScaffoldNetworkTreeView;
