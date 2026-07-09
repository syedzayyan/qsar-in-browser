/* tslint:disable */
/* eslint-disable */

export function dmpnn_threads_ready(): void;

export function initThreadPool(num_threads: number): Promise<any>;

export function model_free(handle: bigint): void;

export function model_get_config(handle: bigint): string;

export function model_get_weights(handle: bigint): Uint8Array;

export function model_infer(handle: bigint, atom_features: Float32Array, n_atoms: number, edge_index: BigInt64Array, n_dir_edges: number, edge_attr: Float32Array): Float32Array;

export function model_load_weights(handle: bigint, bytes: Uint8Array): void;

export function model_new(config_json: string): bigint;

export function model_train_kfold(handle: bigint, mol_atom_features: Float32Array, mol_n_atoms: Uint32Array, mol_edge_index: BigInt64Array, mol_n_dir_edges: Uint32Array, mol_edge_attr: Float32Array, labels: Float32Array, n_splits: number, epochs_per_fold: number, lr: number, n_jobs: number): any;

export function model_train_step(handle: bigint, atom_features: Float32Array, n_atoms: number, edge_index: BigInt64Array, n_dir_edges: number, edge_attr: Float32Array, labels: Float32Array, lr: number): number;

export function model_train_step_batch(handle: bigint, mol_atom_features: Float32Array, mol_n_atoms: Uint32Array, mol_edge_index: BigInt64Array, mol_n_dir_edges: Uint32Array, mol_edge_attr: Float32Array, labels: Float32Array, lr: number, n_jobs: number): number;

export class wbg_rayon_PoolBuilder {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    build(): void;
    mainJS(): string;
    numThreads(): number;
    receiver(): number;
}

export function wbg_rayon_start_worker(receiver: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly dmpnn_threads_ready: () => void;
    readonly model_free: (a: bigint) => void;
    readonly model_get_config: (a: bigint) => [number, number];
    readonly model_get_weights: (a: bigint) => [number, number];
    readonly model_infer: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly model_load_weights: (a: bigint, b: number, c: number) => void;
    readonly model_new: (a: number, b: number) => bigint;
    readonly model_train_kfold: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number) => any;
    readonly model_train_step: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => number;
    readonly model_train_step_batch: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number) => number;
    readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
    readonly initThreadPool: (a: number) => any;
    readonly wbg_rayon_poolbuilder_build: (a: number) => void;
    readonly wbg_rayon_poolbuilder_mainJS: (a: number) => any;
    readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
    readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
    readonly wbg_rayon_start_worker: (a: number) => void;
    readonly memory: WebAssembly.Memory;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
    readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number } | SyncInitInput, memory?: WebAssembly.Memory): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number } | InitInput | Promise<InitInput>, memory?: WebAssembly.Memory): Promise<InitOutput>;
