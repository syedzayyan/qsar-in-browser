/* tslint:disable */
/* eslint-disable */
export const dmpnn_threads_ready: () => void;
export const model_free: (a: bigint) => void;
export const model_get_config: (a: bigint) => [number, number];
export const model_get_weights: (a: bigint) => [number, number];
export const model_infer: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
export const model_load_weights: (a: bigint, b: number, c: number) => void;
export const model_new: (a: number, b: number) => bigint;
export const model_train_kfold: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number) => any;
export const model_train_step: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => number;
export const model_train_step_batch: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number) => number;
export const __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
export const initThreadPool: (a: number) => any;
export const wbg_rayon_poolbuilder_build: (a: number) => void;
export const wbg_rayon_poolbuilder_mainJS: (a: number) => any;
export const wbg_rayon_poolbuilder_numThreads: (a: number) => number;
export const wbg_rayon_poolbuilder_receiver: (a: number) => number;
export const wbg_rayon_start_worker: (a: number) => void;
export const memory: WebAssembly.Memory;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
export const __wbindgen_start: (a: number) => void;
