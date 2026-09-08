// Small request/response helper for the shared RDKit worker. Most worker
// responses are routed by the global handler in app/tools/layout.tsx, but a
// few message types (only_fingerprint, mutate_batch, render_svgs) are left
// for individual callers to listen for locally - this wraps that
// addEventListener/removeEventListener-by-id pattern (first established in
// app/tools/screen/layout.tsx) into a promise.
const RPC_TIMEOUT_MS = 60000;

export function rdkitRpc(rdkit: any, message: any, expectFunction: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      rdkit.removeEventListener("message", handler);
      reject(new Error(`Timed out waiting for RDKit worker (${expectFunction})`));
    }, RPC_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.data.id !== message.id) return;
      if (event.data.error) {
        clearTimeout(timer);
        rdkit.removeEventListener("message", handler);
        reject(new Error(event.data.error));
        return;
      }
      if (event.data.function !== expectFunction) return; // progress messages etc - keep waiting
      clearTimeout(timer);
      rdkit.removeEventListener("message", handler);
      resolve(event.data);
    };

    rdkit.addEventListener("message", handler);
    rdkit.postMessage(message);
  });
}

export function rdkitRequestId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
