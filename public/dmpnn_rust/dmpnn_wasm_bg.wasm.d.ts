/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const model_new: (a: number, b: number) => bigint;
export const model_free: (a: bigint) => void;
export const model_train_step: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => number;
export const model_train_step_batch: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => number;
export const model_infer: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
export const model_get_weights: (a: bigint) => [number, number];
export const model_load_weights: (a: bigint, b: number, c: number) => void;
export const model_get_config: (a: bigint) => [number, number];
export const model_train_kfold: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number) => any;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_start: () => void;
