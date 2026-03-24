```bash
cargo build --release --target wasm32-unknown-unknown

wasm-bindgen target/wasm32-unknown-unknown/release/dmpnn_wasm.wasm \
  --out-dir ../public/dmpnn_rust \
  --target web
  
npx serve # Start the server, if you have Node.js installed
```
