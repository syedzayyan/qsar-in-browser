// fp-settings.ts
//
// Single source of truth for reading fingerprint settings from localStorage.
// All keys are namespaced "fp_*" (written by persistFpSettings in fp-storage.ts).
//
// Usage:
//   import { readFpSettings, readFpSettingsAsFormStuff, readFpSettingsAsFpDets } from "@/lib/fp-settings";
//
//   // GA / combinedJSON / general purpose
//   const fps = readFpSettings();
//
//   // rdkit.postMessage({ function: "only_fingerprint", formStuff: readFpSettingsAsFormStuff() })
//   // rdkit.postMessage({ function: "tanimoto",         fp_dets:   readFpSettingsAsFpDets()    })

import { FpType } from "../dataloader/DataPreProcessToolKit";

// ─── Legacy key map ───────────────────────────────────────────────────────────
// The old code used "fingerprint", "path", "nBits" as raw keys.
// persistFpSettings (fp-storage.ts) now writes "fp_*" keys.
// This reader understands both so existing stored values keep working
// during a gradual migration. New writes always use "fp_*".
const LEGACY: Record<string, string> = {
  fingerprint: "fingerprint",   // old key → "fp_fingerprint" is new
  path:        "path",          // old key for radius/minPath
  nBits:       "nBits",         // old key
};

function ls(newKey: string, legacyKey?: string): string | null {
  return (
    localStorage.getItem(`fp_${newKey}`) ??
    (legacyKey ? localStorage.getItem(legacyKey) : null)
  );
}

function lsNum(newKey: string, legacyKey: string | undefined, fallback: number): number {
  const raw = ls(newKey, legacyKey);
  const n   = Number(raw);
  return raw !== null && isFinite(n) && n > 0 ? n : fallback;
}

function lsBool(newKey: string, fallback: boolean): boolean {
  const raw = ls(newKey, undefined);
  return raw !== null ? raw === "true" : fallback;
}

function lsFp(): FpType {
  const raw = ls("fingerprint", LEGACY.fingerprint);
  const valid: FpType[] = [
    "maccs", "morgan", "rdkit_fp",
    "atom_pair", "topological_torsion", "pattern",
  ];
  // Legacy worker sent "Morgan" (capitalised) — normalise it
  const normalised = (raw ?? "maccs").toLowerCase().replace(/ /g, "_") as FpType;
  return valid.includes(normalised) ? normalised : "maccs";
}

// ─── Shared numeric fields ─────────────────────────────────────────────────────
function lsNBits(fallback = 2048)    { return lsNum("nBits",    LEGACY.nBits, fallback); }
// "path" was used for both radius (Morgan) and minPath (RDKit FP)
function lsPath(fallback = 2)        { return lsNum("path",     LEGACY.path,  fallback); }

// ─── Per-FP extras ────────────────────────────────────────────────────────────
function extrasByFp(fp: FpType): Record<string, unknown> {
  switch (fp) {
    case "morgan":
      return {
        radius:       lsPath(2),
        nBits:        lsNBits(2048),
        useChirality: lsBool("useChirality", false),
        useBondTypes: lsBool("useBondTypes", true),
        useFeatures:  lsBool("useFeatures",  false),
      };
    case "rdkit_fp":
      return {
        minPath:       lsPath(1),
        maxPath:       lsNum("maxPath", undefined, 7),
        nBits:         lsNBits(2048),
        useHs:         lsBool("useHs",         true),
        branchedPaths: lsBool("branchedPaths", true),
        useBondOrder:  lsBool("useBondOrder",  true),
      };
    case "atom_pair":
      return {
        nBits:            lsNBits(2048),
        minDistance:      lsNum("minDistance",      undefined, 1),
        maxDistance:      lsNum("maxDistance",      undefined, 30),
        includeChirality: lsBool("includeChirality", false),
        use2D:            lsBool("use2D",            true),
      };
    case "topological_torsion":
      return {
        nBits:            lsNBits(2048),
        includeChirality: lsBool("includeChirality", false),
      };
    case "pattern":
      return {
        nBits:                lsNBits(2048),
        tautomerFingerprints: lsBool("tautomerFingerprints", false),
      };
    case "maccs":
    default:
      return {};   // fixed 167-bit — no params needed
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * General-purpose settings object.
 * Replaces every ad-hoc readFpSettings() / combinedJSON block.
 *
 * Shape matches what scoreSmilesBatch / runGA expect as `fpSettings`.
 *
 * @example
 *   const fps = readFpSettings();
 *   // { fingerprint: "morgan", radius: 2, nBits: 2048, useChirality: false, … }
 *
 *   const combinedJSON = {
 *     target_data: target,
 *     ligand_data: ligand,
 *     source:      localStorage.getItem("dataSource"),
 *     ...readFpSettings(),   // fp_type, fpPath, nBits all come from here
 *   };
 */
export function readFpSettings(): {
  fingerprint:          FpType;
  // legacy aliases kept so GA code using fpRadius/fpNBits still compiles
  fpRadius:             number;
  fpNBits:              number;
} & Record<string, unknown> {
  const fp     = lsFp();
  const extras = extrasByFp(fp);

  // Derive legacy aliases from the canonical values so old call sites
  // that destructure { fpRadius, fpNBits } continue to work unchanged.
  const fpRadius = (extras.radius as number | undefined) ??
                   (extras.minPath as number | undefined) ??
                   (extras.nBits !== undefined ? 2 : 2);   // fallback
  const fpNBits  = (extras.nBits as number | undefined) ?? 167;

  return {
    fingerprint: fp,
    fpRadius,
    fpNBits,
    ...extras,
  };
}

/**
 * Shape expected by postMessage({ function: "only_fingerprint", formStuff: … })
 * and postMessage({ function: "fingerprint", formStuff: … }).
 *
 * @example
 *   rdkit.postMessage({
 *     function: "only_fingerprint",
 *     id:       requestId,
 *     mol_data: normalised,
 *     formStuff: readFpSettingsAsFormStuff(),
 *   });
 */
export function readFpSettingsAsFormStuff(): Record<string, unknown> {
  const fp     = lsFp();
  const extras = extrasByFp(fp);
  return { fingerprint: fp, ...extras };
}

/**
 * Shape expected by postMessage({ function: "tanimoto", fp_dets: … }).
 *
 * The tanimoto handler reads fp_dets.type, fp_dets.path (legacy radius alias),
 * fp_dets.nBits, and any extra FP-specific keys.
 *
 * @example
 *   rdkit.postMessage({
 *     function:  "tanimoto",
 *     id:        requestId,
 *     mol_data:  ligand,
 *     anchorMol: anchorMol,
 *     fp_dets:   readFpSettingsAsFpDets(),
 *   });
 */
export function readFpSettingsAsFpDets(): Record<string, unknown> {
  const fp     = lsFp();
  const extras = extrasByFp(fp);

  // "path" is the legacy key the old tanimoto_gen code reads for radius/minPath
  const path = (extras.radius as number | undefined) ??
               (extras.minPath as number | undefined) ??
               2;

  return {
    type: fp,
    path,          // legacy alias still consumed by tanimoto_gen
    ...extras,     // also sends radius/minPath directly for the new worker code
  };
}