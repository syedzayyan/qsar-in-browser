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
  Divider,
} from "@mantine/core";
import FAQComp from "../ui-comps/FAQComp";
import LigandContext from "../../context/LigandContext";
import RDKitContext from "../../context/RDKitContext";
import TargetContext from "../../context/TargetContext";
import Loader from "../ui-comps/Loader";

// ─── Fingerprint type registry (mirrors FP_REGISTRY in the worker) ────────────
//
// Kept here so the form knows exactly which fields each FP exposes,
// their labels, and their defaults — without importing the worker file.
//
export const FP_REGISTRY = {
  maccs: {
    label: "MACCS (166-bit, fixed)",
    fixedLength: 167,
    params: {} as Record<string, never>,   // no user-configurable params
  },
  morgan: {
    label: "Morgan (ECFP-like)",
    params: {
      radius:        { label: "Radius",           default: 2,     min: 1, max: 8  },
      nBits:         { label: "Fingerprint Size",  default: 2048,  min: 16        },
      useChirality:  { label: "Use Chirality",     default: false, kind: "bool"   },
      useBondTypes:  { label: "Use Bond Types",    default: true,  kind: "bool"   },
      useFeatures:   { label: "Use Features (FCFP)", default: false, kind: "bool" },
    },
  },
  rdkit_fp: {
    label: "RDKit (Daylight-like)",
    params: {
      minPath:       { label: "Min Path",          default: 1,     min: 1         },
      maxPath:       { label: "Max Path",          default: 7,     min: 1         },
      nBits:         { label: "Fingerprint Size",  default: 2048,  min: 16        },
      useHs:         { label: "Use Hs",            default: true,  kind: "bool"   },
      branchedPaths: { label: "Branched Paths",    default: true,  kind: "bool"   },
      useBondOrder:  { label: "Use Bond Order",    default: true,  kind: "bool"   },
    },
  },
  atom_pair: {
    label: "Atom Pair",
    params: {
      nBits:           { label: "Fingerprint Size",  default: 2048, min: 16        },
      minDistance:     { label: "Min Distance",      default: 1,    min: 0         },
      maxDistance:     { label: "Max Distance",      default: 30,   min: 1         },
      includeChirality:{ label: "Include Chirality", default: false, kind: "bool"  },
      use2D:           { label: "Use 2D",            default: true,  kind: "bool"  },
    },
  },
  topological_torsion: {
    label: "Topological Torsion",
    params: {
      nBits:           { label: "Fingerprint Size",  default: 2048, min: 16        },
      includeChirality:{ label: "Include Chirality", default: false, kind: "bool"  },
    },
  },
  pattern: {
    label: "Pattern (substructure screening)",
    params: {
      nBits:                { label: "Fingerprint Size",    default: 2048, min: 16       },
      tautomerFingerprints: { label: "Tautomer Fingerprints", default: false, kind: "bool" },
    },
  },
} as const;

export type FpType = keyof typeof FP_REGISTRY;

// Flat settings type sent to the worker.
// All FP-specific fields are optional; the worker falls back to its own defaults.
export type FingerPrintSettings = {
  fingerprint: FpType;
  // Morgan
  radius?: number;
  useChirality?: boolean;
  useBondTypes?: boolean;
  useFeatures?: boolean;
  // RDKit FP
  minPath?: number;
  maxPath?: number;
  useHs?: boolean;
  branchedPaths?: boolean;
  useBondOrder?: boolean;
  // Atom Pair
  minDistance?: number;
  maxDistance?: number;
  use2D?: boolean;
  // Shared (nBits, includeChirality)
  nBits?: number;
  includeChirality?: boolean;
  // Topological Torsion — no extra fields beyond nBits + includeChirality
  // Pattern
  tautomerFingerprints?: boolean;
  // Pre-processing
  dedup: boolean;
  log10: boolean;
};

// ─── Default values for the whole form ────────────────────────────────────────
const FORM_DEFAULTS: FingerPrintSettings = {
  fingerprint:          "morgan",
  radius:               2,
  nBits:                2048,
  useChirality:         false,
  useBondTypes:         true,
  useFeatures:          false,
  minPath:              1,
  maxPath:              7,
  useHs:                true,
  branchedPaths:        true,
  useBondOrder:         true,
  minDistance:          1,
  maxDistance:          30,
  includeChirality:     false,
  use2D:                true,
  tautomerFingerprints: false,
  dedup:                true,
  log10:                true,
};

// ─── Component ────────────────────────────────────────────────────────────────
const DataPreProcessToolKit = () => {
  const [loaded]    = useState(true);
  const [stage,     setStage]     = useState<"choose" | "advanced">("choose");
  const [selection, setSelection] = useState<"express" | "advanced">("express");

  const { ligand } = useContext(LigandContext);
  const { rdkit }  = useContext(RDKitContext);
  const { target } = useContext(TargetContext);

  const { control, register, handleSubmit, watch } =
    useForm<FingerPrintSettings>({ defaultValues: FORM_DEFAULTS });

  const fpOption = watch("fingerprint");
  const fpDef    = FP_REGISTRY[fpOption];

  // ── worker call ─────────────────────────────────────────────────────────────
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
        function:         "fingerprint",
        id:               requestId,
        mol_data:         ligand,
        activity_columns: target.activity_columns,
        formStuff:        formSettings,
      });

      rdkit.onerror = (error: ErrorEvent) => {
        console.error("Worker error:", error);
        rdkit.terminate();
      };
    } catch {
      alert(
        "An error occurred while processing the molecules. Please check the console for details."
      );
    }
  };

  // ── stage handlers ───────────────────────────────────────────────────────────
  const handleChooseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selection === "express") {
      processData(null);
    } else {
      setStage("advanced");
    }
  };

  const handleBack = () => setStage("choose");

  if (!loaded) return <Loader loadingText="Processing Molecules" />;

  // ── helpers to render per-FP numeric + bool fields ──────────────────────────
  // We iterate over the current FP's params and render the right control.
  const renderFpParams = () => {
    if (!("params" in fpDef) || Object.keys(fpDef.params).length === 0) {
      return (
        <Text size="sm" c="dimmed">
          MACCS keys have a fixed length of 167 bits — no parameters needed.
        </Text>
      );
    }

    const numericFields: React.ReactNode[] = [];
    const boolFields:    React.ReactNode[] = [];

    for (const [key, meta] of Object.entries(fpDef.params) as [
      keyof FingerPrintSettings,
      { label: string; default: number | boolean; min?: number; kind?: string }
    ][]) {
      if (meta.kind === "bool") {
        boolFields.push(
          <Checkbox
            key={key as string}
            label={meta.label}
            {...register(key as keyof FingerPrintSettings)}
          />
        );
      } else {
        numericFields.push(
          <Controller
            key={key as string}
            name={key as keyof FingerPrintSettings}
            control={control}
            render={({ field }) => (
              <NumberInput
                label={meta.label}
                min={meta.min ?? 1}
                value={(field.value as number) ?? ""}
                onChange={(val) =>
                  field.onChange(
                    val === "" || val === null ? undefined : Number(val)
                  )
                }
              />
            )}
          />
        );
      }
    }

    return (
      <Stack gap="sm">
        {numericFields.length > 0 && <Group grow>{numericFields}</Group>}
        {boolFields.length   > 0 && <Group gap="md">{boolFields}</Group>}
      </Stack>
    );
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {stage === "choose" && (
        <Paper p="md" withBorder>
          <form onSubmit={handleChooseSubmit}>
            <Stack gap="md">
              <Text fw={500} size="lg">
                Generate Molecular Fingerprints
              </Text>
              <p>
                Select how you would like to generate molecular fingerprints
                from the SMILES data:
              </p>
              <Radio.Group
                name="preprocess-mode"
                value={selection}
                onChange={(value: "express" | "advanced") =>
                  setSelection(value)
                }
              >
                <Stack gap="xs">
                  <Radio value="express" label="Express" />
                  <p>Uses default parameters, recommended for beginners.</p>
                  <Radio value="advanced" label="Advanced" />
                  <p>Allows you to specify parameters.</p>
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

              {/* ── Fingerprint type ─────────────────────────────────── */}
              <Controller
                name="fingerprint"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    label="Fingerprint Type"
                    data={Object.entries(FP_REGISTRY).map(([value, def]) => ({
                      value,
                      label: def.label,
                    }))}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />

              {/* ── Per-FP parameter fields ───────────────────────────── */}
              {renderFpParams()}

              <Divider />

              {/* ── Pre-processing options (all FPs) ─────────────────── */}
              <Checkbox
                label="Data De-Duplication (By ID Column)"
                {...register("dedup")}
              />
              <Checkbox
                label="Convert to negative logarithm (base 10)"
                {...register("log10")}
              />

              <Button type="submit">Process Molecules</Button>
            </Stack>
          </form>
        </Paper>
      )}
    </div>
  );
};

export default DataPreProcessToolKit;