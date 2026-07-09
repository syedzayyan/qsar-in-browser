# Build Instructions

This crate now uses [`rayon`](https://github.com/rayon-rs/rayon) (via
[`wasm-bindgen-rayon`](https://github.com/RReverser/wasm-bindgen-rayon)) to
parallelise per-molecule gradient computation across a Web Worker thread pool.
That requires WebAssembly threads support, which isn't stable yet, so the
build needs a nightly toolchain rebuilding `std` with atomics enabled.

`rust-toolchain.toml` and `.cargo/config.toml` in this directory already pin
the nightly version and set the required flags, so a normal build just works:

```bash
cargo build --release --target wasm32-unknown-unknown

wasm-bindgen target/wasm32-unknown-unknown/release/dmpnn_wasm.wasm \
  --out-dir ../public/dmpnn_rust \
  --target web
```

`--target web` is required (not just recommended) — `wasm-bindgen-rayon`
needs `import.meta.url` to spawn worker threads that share the same wasm
module and linear memory, which is only available from that target.

## Threading on the JS side

The generated JS glue exports an async `initThreadPool(numThreads)` (from
`wasm-bindgen-rayon`) and a `dmpnn_threads_ready()` setter (from this crate).
Call both once, right after instantiating the module, before invoking any
training function:

```js
await initDMPNN({ module_or_path: dmpnnWasmUrl });
await initThreadPool(navigator.hardwareConcurrency);
dmpnn_threads_ready(); // tells the Rust side it's safe to use rayon
```

This is already wired up in `public/workers/rdkit.mjs`.

`initThreadPool` needs `SharedArrayBuffer`, which only exists on
cross-origin-isolated pages (`COOP`/`COEP` headers). GitHub Pages can't set
those headers, so `public/coi-serviceworker.js` fakes them client-side and is
registered from the root layout. If it's absent, everything still works —
`model_train_step_batch` and `model_train_kfold` fall back to sequential
execution automatically (checked at runtime via the `n_jobs` argument and the
`dmpnn_threads_ready` flag; `n_jobs == 1` always forces sequential).
