use candle_core::{DType, Device, Result, Tensor};
use candle_nn::{linear, ops::sigmoid, Linear, Module, VarBuilder, VarMap};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DMPNNConfig {
    pub atom_dim: usize,
    pub bond_dim: usize,
    pub hidden_dim: usize,
    pub depth: usize,
    pub dropout: f32,
    pub ffn_hidden_dim: usize,
    pub ffn_num_layers: usize,
    pub num_tasks: usize,
    pub task_type: String,
    pub lr: f64,
}

impl Default for DMPNNConfig {
    fn default() -> Self {
        Self {
            atom_dim: 9,
            bond_dim: 3,
            hidden_dim: 300,
            depth: 3,
            dropout: 0.0,
            ffn_hidden_dim: 300,
            ffn_num_layers: 2,
            num_tasks: 1,
            task_type: "regression".to_string(),
            lr: 1e-3,
        }
    }
}

// ---------------------------------------------------------------------------
// Graph input
// ---------------------------------------------------------------------------
pub struct MolGraph {
    pub atom_features: Tensor,
    pub edge_index: Tensor,
    pub edge_attr: Tensor,
    pub n_atoms: usize,
    pub n_dir_edges: usize,
}

impl MolGraph {
    pub fn from_slices(
        atom_features: &[f32],
        atom_shape: (usize, usize),
        edge_index: &[i64],
        edge_index_shape: (usize, usize),
        edge_attr: &[f32],
        edge_attr_shape: (usize, usize),
        device: &Device,
    ) -> Result<Self> {
        let n_atoms = atom_shape.0;
        let n_dir_edges = edge_index_shape.1;
        Ok(Self {
            // ✅ pass tuples not arrays — candle accepts (usize, usize) as Shape
            atom_features: Tensor::from_slice(atom_features, atom_shape, device)?,
            edge_index: Tensor::from_slice(edge_index, edge_index_shape, device)?,
            edge_attr: Tensor::from_slice(edge_attr, edge_attr_shape, device)?,
            n_atoms,
            n_dir_edges,
        })
    }
}

// ---------------------------------------------------------------------------
// scatter_sum: aggregate messages to target nodes
// ---------------------------------------------------------------------------
fn scatter_sum(messages: &Tensor, dst_idx: &[i64], n_nodes: usize) -> Result<Tensor> {
    let (_n_edges, hidden_dim) = messages.dims2()?;
    let device = messages.device();

    // accumulate as Vec<Vec<f32>> then build tensor once
    let msgs_vec = messages.to_vec2::<f32>()?;
    let mut out = vec![vec![0f32; hidden_dim]; n_nodes];

    for (edge_i, &dst) in dst_idx.iter().enumerate() {
        let dst = dst as usize;
        for d in 0..hidden_dim {
            out[dst][d] += msgs_vec[edge_i][d];
        }
    }

    let flat: Vec<f32> = out.into_iter().flatten().collect();
    Tensor::from_slice(&flat, (n_nodes, hidden_dim), device)
}

// ---------------------------------------------------------------------------
// MLP
// ---------------------------------------------------------------------------
pub struct MLP {
    layers: Vec<Linear>,
}

impl MLP {
    pub fn new(dims: &[usize], vs: VarBuilder) -> Result<Self> {
        let mut layers = Vec::new();
        for (i, (&in_d, &out_d)) in dims.iter().zip(dims.iter().skip(1)).enumerate() {
            layers.push(linear(in_d, out_d, vs.pp(format!("layer_{i}")))?);
        }
        Ok(Self { layers })
    }

    pub fn forward(&self, x: &Tensor) -> Result<Tensor> {
        let mut x = x.clone();
        let last = self.layers.len() - 1;
        for (i, layer) in self.layers.iter().enumerate() {
            x = layer.forward(&x)?;
            if i < last {
                x = x.relu()?;
            }
        }
        Ok(x)
    }
}

// ---------------------------------------------------------------------------
// DMPNNConv
// ---------------------------------------------------------------------------
pub struct DMPNNConv {
    w_i: Linear,
    w_h: Linear,
    w_o: Linear,
    // hidden_dim: usize,
    depth: usize,
}

impl DMPNNConv {
    pub fn new(cfg: &DMPNNConfig, vs: VarBuilder) -> Result<Self> {
        let input_dim = cfg.atom_dim + cfg.bond_dim;
        let w_i = linear(input_dim, cfg.hidden_dim, vs.pp("w_i"))?;
        let w_h = linear(cfg.hidden_dim, cfg.hidden_dim, vs.pp("w_h"))?;
        let w_o = linear(cfg.atom_dim + cfg.hidden_dim, cfg.hidden_dim, vs.pp("w_o"))?;
        Ok(Self {
            w_i,
            w_h,
            w_o,
            // hidden_dim: cfg.hidden_dim,
            depth: cfg.depth,
        })
    }

    pub fn init_edge_state(&self, graph: &MolGraph) -> Result<Tensor> {
        let src_feats = graph
            .atom_features
            .index_select(&graph.edge_index.get(0)?, 0)?;
        // src_feats: (n_dir_edges, atom_dim) ✅ already 2D
        let edge_in = Tensor::cat(&[&src_feats, &graph.edge_attr], 1)?;
        // edge_in: (n_dir_edges, atom_dim+bond_dim) ✅ 2D — fine
        self.w_i.forward(&edge_in)?.relu()
    }

    pub fn step(
        &self,
        h: &Tensor,
        h0: &Tensor,
        graph: &MolGraph,
        rev_edge_index: &[usize],
    ) -> Result<Tensor> {
        let n_dir_edges = graph.n_dir_edges;
        let dst_idx = graph.edge_index.get(1)?.to_vec1::<i64>()?;

        // Aggregate all incoming messages to each node
        let incoming = scatter_sum(h, &dst_idx, graph.n_atoms)?;

        // For each directed edge v→w, subtract the reverse edge message (Chemprop trick)
        let mut messages = Vec::with_capacity(n_dir_edges);
        let src_idx = graph.edge_index.get(0)?.to_vec1::<i64>()?;
        for edge_i in 0..n_dir_edges {
            let src = src_idx[edge_i] as usize;
            let rev_i = rev_edge_index[edge_i];
            let m_v = incoming.get(src)?.unsqueeze(0)?;
            let h_rev = h.get(rev_i)?.unsqueeze(0)?;
            messages.push((m_v - h_rev)?);
        }
        let messages = Tensor::cat(&messages, 0)?;

        // h_{v→w}^{t+1} = ReLU( h0 + W_h · m_{v→w} )
        (h0 + self.w_h.forward(&messages)?)?.relu()
    }

    pub fn readout_nodes(&self, h: &Tensor, graph: &MolGraph) -> Result<Tensor> {
        let dst_idx = graph.edge_index.get(1)?.to_vec1::<i64>()?;
        let aggregated = scatter_sum(h, &dst_idx, graph.n_atoms)?;
        let node_in = Tensor::cat(&[&graph.atom_features, &aggregated], 1)?;
        self.w_o.forward(&node_in)?.relu()
    }
}

// ---------------------------------------------------------------------------
// Reverse edge index
// ---------------------------------------------------------------------------
fn build_rev_edge_index(edge_index: &Tensor, n_dir_edges: usize) -> Result<Vec<usize>> {
    let src = edge_index.get(0)?.to_vec1::<i64>()?;
    let dst = edge_index.get(1)?.to_vec1::<i64>()?;
    let mut edge_map = HashMap::new();
    for i in 0..n_dir_edges {
        edge_map.insert((src[i], dst[i]), i);
    }
    let rev = (0..n_dir_edges)
        .map(|i| {
            *edge_map
                .get(&(dst[i], src[i]))
                .expect("missing reverse edge")
        })
        .collect();
    Ok(rev)
}

// ---------------------------------------------------------------------------
// FFN
// ---------------------------------------------------------------------------
pub struct FFN {
    mlp: MLP,
}

impl FFN {
    pub fn new(cfg: &DMPNNConfig, vs: VarBuilder) -> Result<Self> {
        let mut dims = vec![cfg.hidden_dim];
        for _ in 0..cfg.ffn_num_layers - 1 {
            dims.push(cfg.ffn_hidden_dim);
        }
        dims.push(cfg.num_tasks);
        Ok(Self {
            mlp: MLP::new(&dims, vs.pp("ffn"))?,
        })
    }

    pub fn forward(&self, x: &Tensor, is_classification: bool) -> Result<Tensor> {
        let out = self.mlp.forward(x)?;
        if is_classification {
            sigmoid(&out)
        } else {
            Ok(out)
        }
    }
}

// ---------------------------------------------------------------------------
// Full DMPNN
// ---------------------------------------------------------------------------
pub struct DMPNN {
    conv: DMPNNConv,
    ffn: FFN,
    cfg: DMPNNConfig,
}

impl DMPNN {
    pub fn new(cfg: DMPNNConfig, vs: VarBuilder) -> Result<Self> {
        let conv = DMPNNConv::new(&cfg, vs.pp("conv"))?;
        let ffn = FFN::new(&cfg, vs.pp("ffn"))?;
        Ok(Self { conv, ffn, cfg })
    }

    pub fn forward(&self, graph: &MolGraph) -> Result<Tensor> {
        let rev_edge_index = build_rev_edge_index(&graph.edge_index, graph.n_dir_edges)?;
        let h0 = self.conv.init_edge_state(graph)?;
        let mut h = h0.clone();
        for _ in 0..self.conv.depth {
            h = self.conv.step(&h, &h0, graph, &rev_edge_index)?;
        }
        let node_h = self.conv.readout_nodes(&h, graph)?; // (n_atoms, hidden_dim)
        let graph_h = node_h.sum(0)?; // (hidden_dim,)  ← 1D

        // ✅ unsqueeze to (1, hidden_dim) for linear layers
        let graph_h = graph_h.unsqueeze(0)?; // (1, hidden_dim)

        let is_cls = self.cfg.task_type == "classification";
        let out = self.ffn.forward(&graph_h, is_cls)?; // (1, num_tasks)

        // ✅ squeeze back to (num_tasks,)
        out.squeeze(0)
    }
}

// ---------------------------------------------------------------------------
// Loss
// ---------------------------------------------------------------------------
fn mse_loss(pred: &Tensor, target: &Tensor) -> Result<Tensor> {
    let diff = (pred - target)?;
    (&diff * &diff)?.mean_all()
}

fn bce_loss(pred: &Tensor, target: &Tensor) -> Result<Tensor> {
    let ones = Tensor::ones_like(target)?;
    // ✅ fix: call .neg()? on Tensor not on Result
    let loss = ((target * pred.log()?)? + ((ones.clone() - target)? * (ones - pred)?.log()?)?)?;
    loss.neg()?.mean_all()
}

// ---------------------------------------------------------------------------
// Model handle + weight save/load via VarMap
// ---------------------------------------------------------------------------
pub struct ModelHandle {
    model: DMPNN,
    varmap: VarMap,
    cfg: DMPNNConfig,
    device: Device,
}

// ✅ Save weights: iterate varmap data directly
fn varmap_to_safetensors(varmap: &VarMap) -> Vec<u8> {
    let data = varmap.data().lock().unwrap();

    // Step 1: collect all owned data first
    let mut owned: Vec<(String, safetensors::Dtype, Vec<usize>, Vec<u8>)> = Vec::new();
    for (name, var) in data.iter() {
        let t = var.as_tensor();
        let shape = t.dims().to_vec();
        let dtype = safetensors::Dtype::F32; // we always use F32
        let bytes: Vec<u8> = match t.flatten_all().and_then(|f| f.to_vec1::<f32>()) {
            Ok(vals) => vals.iter().flat_map(|f| f.to_le_bytes()).collect(),
            Err(_) => continue,
        };
        owned.push((name.clone(), dtype, shape, bytes));
    }

    // Step 2: build views that borrow from owned storage
    let views: HashMap<&str, safetensors::tensor::TensorView> = owned
        .iter()
        .filter_map(|(name, dtype, shape, bytes)| {
            safetensors::tensor::TensorView::new(*dtype, shape.clone(), bytes)
                .ok()
                .map(|v| (name.as_str(), v))
        })
        .collect();

    // Step 3: serialize to bytes
    safetensors::tensor::serialize(&views, &None).unwrap_or_default()
}

// ✅ Load weights: set each var individually
fn load_into_varmap(varmap: &VarMap, bytes: &[u8], device: &Device) -> Result<()> {
    // ✅ load_buffer IS a real candle API
    let tensors = candle_core::safetensors::load_buffer(bytes, device)?;
    let mut data = varmap.data().lock().unwrap();
    for (name, tensor) in &tensors {
        if let Some(var) = data.get_mut(name) {
            var.set(tensor)?;
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// WASM exports
// ---------------------------------------------------------------------------
// ✅ no rand needed — use from_vec with hand-crafted small values
fn kaiming_init(shape: &[usize], device: &Device) -> Result<Tensor> {
    let fan_in = shape[shape.len() - 1];
    let std = (2.0 / fan_in as f32).sqrt();
    let n: usize = shape.iter().product();

    // deterministic pseudo-random via simple LCG
    let mut vals = Vec::with_capacity(n);
    let mut seed: u32 = 42;
    for _ in 0..n {
        seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
        // map u32 to [-1, 1]
        let f = (seed as f32 / u32::MAX as f32) * 2.0 - 1.0;
        vals.push(f * std);
    }
    Tensor::from_slice(&vals, shape, device)
}

#[wasm_bindgen]
pub fn model_new(config_json: &str) -> u64 {
    console_error_panic_hook::set_once();
    let cfg: DMPNNConfig =
        serde_json::from_str(config_json).unwrap_or_else(|_| DMPNNConfig::default());
    let device = Device::Cpu;
    let varmap = VarMap::new();
    let vs = VarBuilder::from_varmap(&varmap, DType::F32, &device);

    // ✅ manually init all linear weights with small random values
    // since VarBuilder::zeros gives all-zero weights → degenerate
    let model = DMPNN::new(cfg.clone(), vs).expect("model build failed");

    // Re-init weights with Xavier uniform via small normal noise
    {
        let mut data = varmap.data().lock().unwrap();
        for (name, var) in data.iter_mut() {
            if name.contains("weight") {
                let shape = var.as_tensor().dims().to_vec();
                let t = kaiming_init(&shape, &device).expect("init failed");
                var.set(&t).expect("set failed");
            }
        }
    }

    Box::into_raw(Box::new(ModelHandle {
        model,
        varmap,
        cfg,
        device,
    })) as u64
}

#[wasm_bindgen]
pub fn model_free(handle: u64) {
    unsafe { drop(Box::from_raw(handle as *mut ModelHandle)) }
}

#[wasm_bindgen]
pub fn model_train_step(
    handle: u64,
    atom_features: &[f32],
    n_atoms: usize,
    edge_index: &[i64],
    n_dir_edges: usize,
    edge_attr: &[f32],
    labels: &[f32],
    lr: f64,
) -> f32 {
    let h = unsafe { &mut *(handle as *mut ModelHandle) };

    let graph = MolGraph::from_slices(
        atom_features,
        (n_atoms, 9),
        edge_index,
        (2, n_dir_edges),
        edge_attr,
        (n_dir_edges, 3),
        &h.device,
    )
    .expect("bad graph");

    let pred = h.model.forward(&graph).expect("forward failed");
    let target = Tensor::from_slice(labels, (labels.len(),), &h.device).expect("bad labels");

    let loss = if h.cfg.task_type == "classification" {
        bce_loss(&pred, &target)
    } else {
        mse_loss(&pred, &target)
    }
    .expect("loss failed");

    // ✅ Manual SGD — no rand/getrandom dependency at all
    // ✅ correct scalar multiply in candle
    // in model_train_step, replace the SGD block with:
    let grads = loss.backward().expect("backward failed");
    {
        let mut data = h.varmap.data().lock().unwrap();
        for (_name, var) in data.iter_mut() {
            if let Some(grad) = grads.get(var.as_tensor()) {
                // clip gradient values to [-1, 1]
                let clipped = grad.clamp(-1.0f32, 1.0f32).expect("clamp failed");
                let grad_scaled = clipped.affine(lr, 0.0).expect("scale failed");
                let updated = (var.as_tensor() - &grad_scaled).expect("update failed");
                var.set(&updated).expect("set failed");
            }
        }
    }

    loss.to_scalar::<f32>().unwrap_or(f32::NAN)
}

#[wasm_bindgen]
pub fn model_infer(
    handle: u64,
    atom_features: &[f32],
    n_atoms: usize,
    edge_index: &[i64],
    n_dir_edges: usize,
    edge_attr: &[f32],
) -> Vec<f32> {
    let h = unsafe { &*(handle as *const ModelHandle) };

    let graph = MolGraph::from_slices(
        atom_features,
        (n_atoms, 9),
        edge_index,
        (2, n_dir_edges),
        edge_attr,
        (n_dir_edges, 3),
        &h.device,
    )
    .expect("bad graph");

    h.model
        .forward(&graph)
        .expect("forward failed")
        .to_vec1::<f32>()
        .unwrap_or_default()
}

#[wasm_bindgen]
pub fn model_get_weights(handle: u64) -> Vec<u8> {
    let h = unsafe { &*(handle as *const ModelHandle) };
    varmap_to_safetensors(&h.varmap) // ✅ no .unwrap_or_default()
}

#[wasm_bindgen]
pub fn model_load_weights(handle: u64, bytes: &[u8]) {
    let h = unsafe { &mut *(handle as *mut ModelHandle) };
    load_into_varmap(&h.varmap, bytes, &h.device).expect("load failed");
}

#[wasm_bindgen]
pub fn model_get_config(handle: u64) -> String {
    let h = unsafe { &*(handle as *const ModelHandle) };
    serde_json::to_string(&h.cfg).unwrap_or_default()
}

// ---------------------------------------------------------------------------
// K-Fold CV training (mirrors the Python sklearn pipeline)
// ---------------------------------------------------------------------------
#[wasm_bindgen]
pub fn model_train_kfold(
    handle: u64,
    // flat atom/edge arrays for ALL molecules concatenated,
    // with offsets so we can slice per molecule
    mol_atom_features: &[f32], // (total_atoms, atom_dim) flat
    mol_n_atoms: &[usize],     // one per molecule
    mol_edge_index: &[i64],    // (2, total_dir_edges) flat
    mol_n_dir_edges: &[usize], // one per molecule
    mol_edge_attr: &[f32],     // (total_dir_edges, bond_dim) flat
    labels: &[f32],            // one per molecule
    n_splits: usize,
    epochs_per_fold: usize,
    lr: f64,
) -> JsValue {
    let h = unsafe { &mut *(handle as *mut ModelHandle) };
    let n_mols = mol_n_atoms.len();
    let is_cls = h.cfg.task_type == "classification";

    // ── Build per-molecule graph slices (offsets) ──────────────────────────
    let mut atom_offsets = vec![0usize; n_mols + 1];
    let mut edge_offsets = vec![0usize; n_mols + 1];
    for i in 0..n_mols {
        atom_offsets[i + 1] = atom_offsets[i] + mol_n_atoms[i];
        edge_offsets[i + 1] = edge_offsets[i] + mol_n_dir_edges[i];
    }

    // ── Simple deterministic k-fold split ─────────────────────────────────
    let fold_size = n_mols / n_splits;
    let mut fold_metrics: Vec<Vec<f32>> = Vec::new();
    // per_fold_preds: Vec of folds, each fold = Vec of {x, y, mol_idx}
    let mut per_fold_preds: Vec<Vec<(f32, f32, usize)>> = Vec::new();

    for fold in 0..n_splits {
        let test_start = fold * fold_size;
        let test_end = if fold == n_splits - 1 {
            n_mols
        } else {
            test_start + fold_size
        };
        let train_indices: Vec<usize> = (0..n_mols)
            .filter(|&i| i < test_start || i >= test_end)
            .collect();
        let test_indices: Vec<usize> = (test_start..test_end).collect();

        // Re-init a fresh model for this fold
        let fold_varmap = VarMap::new();
        let fold_vs = VarBuilder::from_varmap(&fold_varmap, DType::F32, &h.device);
        let fold_model = DMPNN::new(h.cfg.clone(), fold_vs).expect("fold model failed");
        // Kaiming init
        {
            let mut data = fold_varmap.data().lock().unwrap();
            for (name, var) in data.iter_mut() {
                if name.contains("weight") {
                    let shape = var.as_tensor().dims().to_vec();
                    let t = kaiming_init(&shape, &h.device).expect("init");
                    var.set(&t).expect("set");
                }
            }
        }

        // ── Train on train_indices ─────────────────────────────────────────
        for _epoch in 0..epochs_per_fold {
            for &mol_i in &train_indices {
                let a_start = atom_offsets[mol_i] * h.cfg.atom_dim;
                let a_end = atom_offsets[mol_i + 1] * h.cfg.atom_dim;
                let e_start = edge_offsets[mol_i] * h.cfg.bond_dim;
                let e_end = edge_offsets[mol_i + 1] * h.cfg.bond_dim;
                let ei_start = edge_offsets[mol_i] * 2;
                let ei_end = edge_offsets[mol_i + 1] * 2;

                let graph = MolGraph::from_slices(
                    &mol_atom_features[a_start..a_end],
                    (mol_n_atoms[mol_i], h.cfg.atom_dim),
                    &mol_edge_index[ei_start..ei_end],
                    (2, mol_n_dir_edges[mol_i]),
                    &mol_edge_attr[e_start..e_end],
                    (mol_n_dir_edges[mol_i], h.cfg.bond_dim),
                    &h.device,
                )
                .expect("graph");

                let pred = fold_model.forward(&graph).expect("fwd");
                let target = Tensor::from_slice(&[labels[mol_i]], (1,), &h.device).expect("target");

                let loss = if is_cls {
                    bce_loss(&pred, &target)
                } else {
                    mse_loss(&pred, &target)
                }
                .expect("loss");

                let grads = loss.backward().expect("bwd");
                let mut data = fold_varmap.data().lock().unwrap();
                for (_, var) in data.iter_mut() {
                    if let Some(grad) = grads.get(var.as_tensor()) {
                        let clipped = grad.clamp(-1.0f32, 1.0f32).expect("clamp");
                        let scaled = clipped.affine(lr, 0.0).expect("scale");
                        let updated = (var.as_tensor() - &scaled).expect("upd");
                        var.set(&updated).expect("set");
                    }
                }
            }
        }

        // ── Evaluate on test_indices ───────────────────────────────────────
        let mut preds_test: Vec<f32> = Vec::new();
        for &mol_i in &test_indices {
            let a_start = atom_offsets[mol_i] * h.cfg.atom_dim;
            let a_end = atom_offsets[mol_i + 1] * h.cfg.atom_dim;
            let e_start = edge_offsets[mol_i] * h.cfg.bond_dim;
            let e_end = edge_offsets[mol_i + 1] * h.cfg.bond_dim;
            let ei_start = edge_offsets[mol_i] * 2;
            let ei_end = edge_offsets[mol_i + 1] * 2;

            let graph = MolGraph::from_slices(
                &mol_atom_features[a_start..a_end],
                (mol_n_atoms[mol_i], h.cfg.atom_dim),
                &mol_edge_index[ei_start..ei_end],
                (2, mol_n_dir_edges[mol_i]),
                &mol_edge_attr[e_start..e_end],
                (mol_n_dir_edges[mol_i], h.cfg.bond_dim),
                &h.device,
            )
            .expect("graph");

            let p = fold_model
                .forward(&graph)
                .expect("infer")
                .to_vec1::<f32>()
                .unwrap_or_default();
            preds_test.push(p.get(0).copied().unwrap_or(f32::NAN));
        }

        // ── Metrics ────────────────────────────────────────────────────────
        let fold_labels: Vec<f32> = test_indices.iter().map(|&i| labels[i]).collect();
        let metric = if is_cls {
            let correct = preds_test
                .iter()
                .zip(&fold_labels)
                .filter(|(&p, &y)| (p >= 0.5) == (y >= 0.5))
                .count();
            let acc = correct as f32 / fold_labels.len() as f32;
            // simple AUROC approximation (rank-based)
            let auc = approx_auroc(&fold_labels, &preds_test);
            vec![acc, auc]
        } else {
            let mae = preds_test
                .iter()
                .zip(&fold_labels)
                .map(|(&p, &y)| (p - y).abs())
                .sum::<f32>()
                / fold_labels.len() as f32;
            vec![mae]
        };
        fold_metrics.push(metric);
        per_fold_preds.push(
            test_indices
                .iter()
                .zip(preds_test.iter())
                .map(|(&mol_i, &pred)| (labels[mol_i], pred, mol_i))
                .collect(),
        );
    }

    // ── Serialize result as JSON to hand back to JS ────────────────────────
    serde_wasm_bindgen::to_value(&KFoldResult {
        fold_metrics,
        per_fold_preds: per_fold_preds
            .iter()
            .map(|fold| {
                fold.iter()
                    .map(|&(y, p, i)| PredPoint {
                        y,
                        pred: p,
                        mol_idx: i,
                    })
                    .collect()
            })
            .collect(),
    })
    .unwrap_or(JsValue::NULL)
}

// ── AUROC (Mann-Whitney U, O(n²) — fine for typical fold sizes) ───────────
fn approx_auroc(labels: &[f32], scores: &[f32]) -> f32 {
    let pos: Vec<f32> = labels
        .iter()
        .zip(scores)
        .filter(|(&y, _)| y >= 0.5)
        .map(|(_, &s)| s)
        .collect();
    let neg: Vec<f32> = labels
        .iter()
        .zip(scores)
        .filter(|(&y, _)| y < 0.5)
        .map(|(_, &s)| s)
        .collect();
    if pos.is_empty() || neg.is_empty() {
        return 0.5;
    }
    let u: usize = pos
        .iter()
        .map(|&p| neg.iter().filter(|&&n| p > n).count())
        .sum();
    u as f32 / (pos.len() * neg.len()) as f32
}

#[derive(Serialize)]
struct PredPoint {
    y: f32,
    pred: f32,
    mol_idx: usize,
}

#[derive(Serialize)]
struct KFoldResult {
    fold_metrics: Vec<Vec<f32>>,
    per_fold_preds: Vec<Vec<PredPoint>>,
}
