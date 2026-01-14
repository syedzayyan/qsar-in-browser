"use client";


import {
  Container,
  Flex,
  Anchor,
  ActionIcon,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import Link from "next/link";


import React, { useState } from "react";
import { Textarea, Group, Chip, Stack, Text, Loader, Paper, Button } from "@mantine/core";
import JSME from "../../components/tools/toolViz/JSMEComp";

type TargetSummary = {
  id: string;             // original input (ChEMBL or UniProt)
  resolvedId: string;     // ChEMBL target id used for activity query
  totalCount: number | null;
  error?: string;
};

async function resolveToChemblTargetId(rawId: string): Promise<{ resolvedId?: string; error?: string }> {
  const id = rawId.trim();

  // Heuristic: if it already looks like a ChEMBL target, use it directly.
  // (e.g. CHEMBL226, CHEMBL203, etc.) [web:9]
  if (/^CHEMBL\d+$/i.test(id)) {
    return { resolvedId: id.toUpperCase() };
  }

  // Otherwise treat as UniProt accession and map via target endpoint. [web:9][web:11]
  const url = `https://www.ebi.ac.uk/chembl/api/data/target.json?target_components__accession=${encodeURIComponent(
    id
  )}`;

  const res = await fetch(url);
  if (!res.ok) {
    return { error: `Target lookup HTTP ${res.status}` };
  }

  const json = await res.json();
  const first = json?.targets?.[0];
  const chemblId = first?.target_chembl_id;

  if (!chemblId) {
    return { error: "No ChEMBL target found for this UniProt ID" };
  }

  return { resolvedId: chemblId };
}

async function fetchTotalCountForTarget(rawId: string): Promise<TargetSummary> {
  const { resolvedId, error: resolveError } = await resolveToChemblTargetId(rawId);

  if (!resolvedId) {
    return { id: rawId, resolvedId: rawId, totalCount: null, error: resolveError ?? "Unable to resolve ID" };
  }

  const url = `https://www.ebi.ac.uk/chembl/api/data/activity.json?target_chembl_id=${encodeURIComponent(
    resolvedId
  )}`;

  const res = await fetch(url);
  if (!res.ok) {
    return {
      id: rawId,
      resolvedId,
      totalCount: null,
      error: `Activity HTTP ${res.status}`,
    };
  }

  const json = await res.json();
  // page_meta.total_count holds the total number of activity records. [file:1][web:9]
  const totalCount = json?.page_meta?.total_count ?? null;

  return { id: rawId, resolvedId, totalCount };
}

function ChemblActivityCounter() {
  const [input, setInput] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [results, setResults] = useState<TargetSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const parseTargets = (raw: string): string[] => {
    const parts = raw
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    return Array.from(new Set(parts));
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    const parsed = parseTargets(value);
    setTargets(parsed); // tags update automatically
    setResults([]);
  };

  const handleRemoveTag = (id: string) => {
    const remaining = targets.filter((t) => t !== id);
    setTargets(remaining);
    setInput(remaining.join(", "));
    setResults((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRunQuery = async () => {
    if (!targets.length) return;
    setLoading(true);
    try {
      const summaries = await Promise.all(targets.map(fetchTotalCountForTarget));
      setResults(summaries);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="sm" p="md" mt="md">
      <Stack gap="md">
        <Textarea
          label="Targets (ChEMBL or UniProt)"
          description="Paste ChEMBL target IDs (e.g. CHEMBL226) or UniProt accessions (e.g. P05067)."
          placeholder={`CHEMBL226
P05067
CHEMBL203`}
          minRows={4}
          value={input}
          onChange={(event) => handleInputChange(event.currentTarget.value)}
        />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            IDs are automatically converted into tags below.
          </Text>
          <Button onClick={handleRunQuery} disabled={!targets.length || loading}>
            {loading ? <Loader size="xs" /> : "Run query"}
          </Button>
        </Group>

        {targets.length > 0 && (
          <Stack gap="xs">
            <Text size="sm">Input IDs:</Text>
            <Group gap="xs">
              {targets.map((id) => (
                <Chip
                  key={id}
                  checked
                  onChange={() => handleRemoveTag(id)}
                  color="blue"
                  radius="sm"
                >
                  {id}
                </Chip>
              ))}
            </Group>
            <Text size="xs" c="dimmed">
              Click a tag to remove it.
            </Text>
          </Stack>
        )}

        {results.length > 0 && (
          <Stack gap="xs">
            <Text fw={500}>Activity counts per target</Text>
            {results.map((r) => (
              <Text key={r.id} size="sm">
                {r.id}
                {r.resolvedId && r.resolvedId !== r.id ? ` → ${r.resolvedId}` : ""}:{" "}
                {r.error
                  ? `Error: ${r.error}`
                  : r.totalCount !== null
                  ? `${r.totalCount} Compounds With Activity`
                  : "No total_count found"}
              </Text>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

export default function JSMEPOPO() {
      const { colorScheme, setColorScheme } = useMantineColorScheme();
    
  function handleChange(smiles: string) {
    console.log(smiles);
  }

  return (
    <>
          {/* Navbar */}
      <Container size="lg" py="md">
        <Flex align="center" justify="space-between">
          {/* Left: Title */}
          <Text size="lg" fw={600}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              QSAR IN THE BROWSER
            </Link>
          </Text>

          {/* Right: About link and theme button */}
          <Group gap="sm">
            <Anchor
              component={Link}
              href="/about"
              size="sm"
              underline="hover"
              c="dimmed"
            >
              About
            </Anchor>

            <Anchor
              component={Link}
              href="/about"
              size="sm"
              underline="hover"
              c="dimmed"
            >
              GitHub
            </Anchor>

            <ActionIcon
              onClick={() =>
                setColorScheme(colorScheme === "light" ? "dark" : "light")
              }
              variant="default"
              size="lg"
              radius="md"
              aria-label="Toggle color scheme"
            >
              {colorScheme === "dark" ? (
                <IconSun stroke={1.5} />
              ) : (
                <IconMoon stroke={1.5} />
              )}
            </ActionIcon>
          </Group>
        </Flex>
      </Container>
      <Container size="lg" py="xl">
        <JSME height="500px" width="500px" onChange={handleChange} />
        <ChemblActivityCounter />
      </Container>
    </>
  );
}
