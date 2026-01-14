"use client";

import React, { useContext, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Button,
  Radio,
  Group,
  Stack,
  Text,
  Select,
  NumberInput,
  Checkbox,
  Paper,
} from "@mantine/core";
import FAQComp from "../ui-comps/FAQComp";
import LigandContext from "../../context/LigandContext";
import RDKitContext from "../../context/RDKitContext";
import TargetContext from "../../context/TargetContext";
import Loader from "../ui-comps/Loader";

type FingerPrintSettings = {
  fingerprint: "maccs" | "morgan" | "rdkit_fp";
  radius?: number;
  nBits?: number;
  dedup: boolean;
  log10: boolean;
};

const DataPreProcessToolKit = () => {
  const [loaded] = useState(true);
  const [stage, setStage] = useState<"choose" | "advanced">("choose");
  const [selection, setSelection] = useState<"express" | "advanced">("express");

  const { ligand } = useContext(LigandContext);
  const { rdkit } = useContext(RDKitContext);
  const { target } = useContext(TargetContext);

  const {
    control,
    register,
    handleSubmit,
    watch,
  } = useForm<FingerPrintSettings>({
    defaultValues: {
      fingerprint: "morgan",
      radius: 2,
      nBits: 2048,
      dedup: true,
      log10: true,
    },
  });

  const fpOption = watch("fingerprint");

  const processData = async (formSettings: FingerPrintSettings | null = null) => {
    if (!rdkit) {
      alert("RDKit is not loaded yet. Please wait a moment and try again.");
      return;
    }

    const requestId = `fingerprint_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      rdkit.postMessage({
        function: "fingerprint",
        id: requestId,
        mol_data: ligand,
        activity_columns: target.activity_columns,
        formStuff: formSettings,
      });

      rdkit.onerror = (error) => {
        console.error("Worker error:", error);
        rdkit.terminate();
      };
    } catch {
      alert(
        "An error occurred while processing the molecules. Please check the console for details."
      );
    }
  };

  const handleChooseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selection === "express") {
      processData(null);
    } else if (selection === "advanced") {
      setStage("advanced");
    }
  };

  const handleBack = () => {
    setStage("choose");
  };

  if (!loaded) {
    return <Loader loadingText="Processing Molecules" />;
  }

  return (
    <div>
      <FAQComp>
        <p>
          In order for small molecules to be visualised, compounds need to be
          converted into a fingerprint: a collection of 0s and 1s representing
          chemical motifs or environments.
        </p>
        <p>
          If you have downloaded data from ChEMBL, there may be duplicates. You
          can also choose whether to convert activity values to negative
          logarithm base 10.
        </p>
      </FAQComp>

      {stage === "choose" && (
        <Paper p="md" withBorder>
          <form onSubmit={handleChooseSubmit}>
            <Stack gap="md">
              <Text fw={500} size="lg">
                Pre-Processing Molecules
              </Text>

              <Radio.Group
                name="preprocess-mode"
                value={selection}
                onChange={(value: "express" | "advanced") => setSelection(value)}
              >
                <Stack gap="xs">
                  <Radio value="express" label="Express" />
                  <Radio value="advanced" label="Advanced" />
                </Stack>
              </Radio.Group>

              <Button type="submit" disabled={!selection}>
                Submit
              </Button>
            </Stack>
          </form>
        </Paper>
      )}

      {stage === "advanced" && (
        <Paper p="md" withBorder mt="md">
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={handleBack}>
              ← Back
            </Button>
            <Text fw={500}>Advanced Pre-Processing</Text>
          </Group>

          <form onSubmit={handleSubmit((values) => processData(values))}>
            <Stack gap="md">
              {/* fingerprint select via Controller */}
              <Controller
                name="fingerprint"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    label="Fingerprint Type"
                    data={[
                      { value: "maccs", label: "MACCS Fingerprint" },
                      { value: "morgan", label: "Morgan Fingerprint" },
                      { value: "rdkit_fp", label: "RDKit Fingerprint" },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />

              {(fpOption === "morgan" || fpOption === "rdkit_fp") && (
                <Group grow>
                  {/* radius as NumberInput + Controller */}
                  <Controller
                    name="radius"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Radius Size"
                        min={1}
                        value={field.value ?? ""}
                        onChange={(val) =>
                          field.onChange(
                            val === "" || val === null ? undefined : Number(val)
                          )
                        }
                      />
                    )}
                  />

                  {/* nBits as NumberInput + Controller */}
                  <Controller
                    name="nBits"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Fingerprint Size"
                        min={16}
                        value={field.value ?? ""}
                        onChange={(val) =>
                          field.onChange(
                            val === "" || val === null ? undefined : Number(val)
                          )
                        }
                      />
                    )}
                  />
                </Group>
              )}

              <Checkbox
                label="Data De-Duplication (By ID Column)"
                {...register("dedup")}
              />

              <Checkbox
                label="Convert to negative logarithm (base 10)"
                {...register("log10")}
              />

              <Button type="submit">Process Molecule</Button>
            </Stack>
          </form>
        </Paper>
      )}
    </div>
  );
};

export default DataPreProcessToolKit;
