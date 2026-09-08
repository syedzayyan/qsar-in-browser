export const PUBCHEM_DOWN_MESSAGE =
  "PubChem's servers seem to be unavailable right now - this isn't an issue with QITB. Please try again in a little while.";

export const UNIPROT_DOWN_MESSAGE =
  "UniProt's servers seem to be unavailable right now - this isn't an issue with QITB. Please try again in a little while.";

// PubChem asks clients to keep concurrent requests low (they throttle/503 otherwise),
// so CID batches are resolved through a small worker pool rather than fired all at once.
const CID_BATCH_SIZE = 300;
const CID_BATCH_CONCURRENCY = 3;

// PubChem's "server busy" throttling is usually transient load, not a hard
// failure - a short backoff and retry clears it most of the time instead of
// surfacing an error for what's really just "try again in a second".
const BUSY_RETRY_ATTEMPTS = 4;
const BUSY_RETRY_BASE_DELAY_MS = 1000;

function isPubChemBusyError(error: any): boolean {
  return error?.pubchemBusy === true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPubChemJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = "";
    let code = "";
    try {
      const body = await response.json();
      detail = body?.Fault?.Message || "";
      code = body?.Fault?.Code || "";
    } catch {
      // response body wasn't JSON - fall back to the status code below
    }
    const error: any = new Error(detail || `PubChem responded with status ${response.status}`);
    // PUGREST.ServerBusy / a 503 are transient overload signals worth retrying;
    // everything else (bad input, not found, ...) isn't.
    error.pubchemBusy = response.status === 503 || code === "PUGREST.ServerBusy";
    throw error;
  }
  return response.json();
}

/**
 * Same as fetchPubChemJson, but retries a "server busy" response with
 * exponential backoff (+ jitter) instead of failing the whole request.
 */
export async function fetchPubChemJsonWithRetry(url: string, options?: RequestInit) {
  let lastError: any;
  for (let attempt = 0; attempt <= BUSY_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchPubChemJson(url, options);
    } catch (error) {
      lastError = error;
      if (!isPubChemBusyError(error) || attempt === BUSY_RETRY_ATTEMPTS) throw error;
      const delay = BUSY_RETRY_BASE_DELAY_MS * 2 ** attempt + Math.random() * 500;
      await sleep(delay);
    }
  }
  throw lastError;
}

/**
 * Resolves a list of PubChem CIDs to isomeric SMILES strings, batching requests
 * to stay within PubChem's informal rate limits. Returns a map of CID -> SMILES;
 * CIDs PubChem couldn't resolve are simply absent from the map.
 */
export async function resolveSmilesForCids(
  cids: (string | number)[],
  onProgress?: (resolved: number, total: number) => void,
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(cids.map(String))).filter(Boolean);
  const smilesMap = new Map<string, string>();
  if (unique.length === 0) return smilesMap;

  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += CID_BATCH_SIZE) {
    batches.push(unique.slice(i, i + CID_BATCH_SIZE));
  }

  let resolved = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < batches.length) {
      const batch = batches[cursor++];
      const data = await fetchPubChemJsonWithRetry(
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/property/IsomericSMILES/JSON",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ cid: batch.join(",") }),
        },
      );
      for (const prop of data?.PropertyTable?.Properties || []) {
        if (prop.CID != null && prop.SMILES) {
          smilesMap.set(String(prop.CID), prop.SMILES);
        }
      }
      resolved += batch.length;
      onProgress?.(Math.min(resolved, unique.length), unique.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(CID_BATCH_CONCURRENCY, batches.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return smilesMap;
}
