import React, { useContext, useEffect, useState } from "react";
import RDKitContext from "../../../context/RDKitContext";
import LigandContext from "../../../context/LigandContext";


import {
  Card,
  Group,
  Stack,
  SimpleGrid,
  Checkbox,
  TextInput,
  Button,
  Title,
  Text,
  Divider,
  Tooltip,
  rem,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCheck, IconX, IconInfoCircle } from "@tabler/icons-react";
import NotificationContext from "../../../context/NotificationContext";

type ScaffoldNetParams = {
  includeGenericScaffolds: boolean;
  includeGenericBondScaffolds: boolean;
  includeScaffoldsWithoutAttachments: boolean;
  includeScaffoldsWithAttachments: boolean;
  keepOnlyFirstFragment: boolean;
  pruneBeforeFragmenting: boolean;
  flattenIsotopes: boolean;
  flattenChirality: boolean;
  flattenKeepLargest: boolean;
  collectMolCounts: boolean;
  bondBreakersRxns: string;
};


const initialValues: ScaffoldNetParams = {
  includeGenericScaffolds: true,
  includeGenericBondScaffolds: false,
  includeScaffoldsWithoutAttachments: true,
  includeScaffoldsWithAttachments: true,
  keepOnlyFirstFragment: true,
  pruneBeforeFragmenting: true,
  flattenIsotopes: true,
  flattenChirality: true,
  flattenKeepLargest: true,
  collectMolCounts: true,
  bondBreakersRxns: "",
}


export default function ScaffoldSettings() {
  const { ligand } = useContext(LigandContext);
  const { rdkit } = useContext(RDKitContext);
  const {notifications, pushNotification} = useContext(NotificationContext);

  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ScaffoldNetParams>({
    initialValues: {
      includeGenericScaffolds: true,
      includeGenericBondScaffolds: false,
      includeScaffoldsWithoutAttachments: true,
      includeScaffoldsWithAttachments: true,
      keepOnlyFirstFragment: true,
      pruneBeforeFragmenting: true,
      flattenIsotopes: true,
      flattenChirality: true,
      flattenKeepLargest: true,
      collectMolCounts: true,
      bondBreakersRxns: "",
    },

    // optional validation if you want (example: limit bondBreakers length)
    validate: {
      bondBreakersRxns: (v) => (v.length > 1000 ? "Too long" : null),
    },
  });

  const onSubmit = async (values: ScaffoldNetParams) => {
    setSubmitting(true);
    try {
      // Prepare params payload (only include bondBreakersRxns if non-empty)
      const params: Record<string, any> = {
        includeGenericScaffolds: values.includeGenericScaffolds,
        includeGenericBondScaffolds: values.includeGenericBondScaffolds,
        includeScaffoldsWithoutAttachments: values.includeScaffoldsWithoutAttachments,
        includeScaffoldsWithAttachments: values.includeScaffoldsWithAttachments,
        keepOnlyFirstFragment: values.keepOnlyFirstFragment,
        pruneBeforeFragmenting: values.pruneBeforeFragmenting,
        flattenIsotopes: values.flattenIsotopes,
        flattenChirality: values.flattenChirality,
        flattenKeepLargest: values.flattenKeepLargest,
        collectMolCounts: values.collectMolCounts,
      };
      if (values.bondBreakersRxns?.trim()) params["bondBreakersRxns"] = values.bondBreakersRxns.trim();

      // small delay to let UI update if needed
      await new Promise((r) => setTimeout(r, 60));

      // Collect smiles and call your scaffold function
      const smiles_list = ligand.map((x: any) => x.canonical_smiles);

      // Serialize as plain JSON
      // const serialised_graph = serializeGraph(network_graph);
      // await setTarget({ ...target, scaffold_network: serialised_graph });

      rdkit.postMessage({
        id: "scaffold_network_" + Date.now(),
        function: "scaffold_network",
        params: params,
        smiles_list: smiles_list,
      })

      pushNotification({
        message: "Scaffold network generation started",
        id: "scaffold_network_" + Date.now(),
        done: false,
        type: 'info',
      });

    } catch (err: any) {
      console.error(err);
      pushNotification({
        message: err?.message ? String(err.message) : "An unexpected error occurred.",
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isRunning = notifications.some((n) => n.id.startsWith("scaffold_network_") && !n.done);

  return (
    <Card shadow="sm" radius="md" p="md" withBorder>
      <Group align="flex-start" mb="xs">
        <div>
          <Title order={4} style={{ lineHeight: 1.1 }}>
            Scaffold Network — Settings
          </Title>
          <Text size="sm" color="dimmed">
            Configure how scaffolds are extracted and how the scaffold network is built.
          </Text>
        </div>

        <Tooltip label="These settings control the RDKit-based scaffold extraction & chunking" withArrow>
          <IconInfoCircle />
        </Tooltip>
      </Group>

      <Divider my="sm" />

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          {/* grouped checkboxes in a nice grid */}
          <SimpleGrid cols={2}>
            <Checkbox
              {...form.getInputProps("includeGenericScaffolds", { type: "checkbox" })}
              label="Include generic scaffolds"
              description="Abstract generic frameworks (remove atom labels)"
            />

            <Checkbox
              {...form.getInputProps("includeGenericBondScaffolds", { type: "checkbox" })}
              label="Include generic bond scaffolds"
              description="Also abstract bonds to generic bond types"
            />

            <Checkbox
              {...form.getInputProps("includeScaffoldsWithoutAttachments", { type: "checkbox" })}
              label="Scaffolds without attachments"
            />

            <Checkbox
              {...form.getInputProps("includeScaffoldsWithAttachments", { type: "checkbox" })}
              label="Scaffolds with attachments"
            />

            <Checkbox
              {...form.getInputProps("keepOnlyFirstFragment", { type: "checkbox" })}
              label="Keep only first fragment"
              description="If fragmentation yields multiple fragments, keep the first"
            />

            <Checkbox
              {...form.getInputProps("pruneBeforeFragmenting", { type: "checkbox" })}
              label="Prune before fragmenting"
            />

            <Checkbox {...form.getInputProps("flattenIsotopes", { type: "checkbox" })} label="Flatten isotopes" />
            <Checkbox {...form.getInputProps("flattenChirality", { type: "checkbox" })} label="Flatten chirality" />

            <Checkbox {...form.getInputProps("flattenKeepLargest", { type: "checkbox" })} label="Keep largest flatten" />
            <Checkbox {...form.getInputProps("collectMolCounts", { type: "checkbox" })} label="Collect molecule counts" />
          </SimpleGrid>

          <TextInput
            mt="xs"
            label="bondBreakersRxns"
            description="Optional reaction SMARTS (one-line). Used to break bonds as specified."
            placeholder="e.g. [C:1]-[O:2]>>[C:1].[O:2]"
            {...form.getInputProps("bondBreakersRxns")}
          />

          <Group align="center" mt="sm">
            <Text size="sm" color="dimmed">
              Ready to run on {ligand?.length ?? 0} ligand(s)
            </Text>

            <Group >
              <Button variant="default" onClick={() => form.setValues(initialValues)} disabled={submitting}>
                Reset
              </Button>

              <Button type="submit" loading={submitting} disabled={submitting || ligand.length === 0 || isRunning}>
                {isRunning ? "Running network..." : "Run network"}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
