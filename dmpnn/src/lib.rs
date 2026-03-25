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
            atom_dim: 72,
            bond_dim: 14,
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
        Ok(Self {
            atom_features: Tensor::from_slice(atom_features, atom_shape, device)?,
            edge_index: Tensor::from_slice(edge_index, edge_index_shape, device)?,
            edge_attr: Tensor::from_slice(edge_attr, edge_attr_shape, device)?,
            n_atoms: atom_shape.0,
            n_dir_edges: edge_index_shape.1,
        })
    }
}

// ---------------------------------------------------------------------------
// scatter_sum — vectorised via index_add (no to_vec2 loops)
// ---------------------------------------------------------------------------
fn scatter_sum(messages: &Tensor, dst_idx: &[i64], n_nodes: usize) -> Result<Tensor> {
    let (n_edges, hidden_dim) = messages.dims2()?;
    let device = messages.device();
    let out = Tensor::zeros((n_nodes, hidden_dim), messages.dtype(), device)?;
    let dst = Tensor::from_slice(dst_idx, (n_edges,), device)?;
    out.index_add(&dst, messages, 0)
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
    depth: usize,
}

impl DMPNNConv {
    pub fn new(cfg: &DMPNNConfig, vs: VarBuilder) -> Result<Self> {
        let input_dim = cfg.atom_dim + cfg.bond_dim;
        Ok(Self {
            w_i: linear(input_dim, cfg.hidden_dim, vs.pp("w_i"))?,
            w_h: linear(cfg.hidden_dim, cfg.hidden_dim, vs.pp("w_h"))?,
            w_o: linear(cfg.atom_dim + cfg.hidden_dim, cfg.hidden_dim, vs.pp("w_o"))?,
            depth: cfg.depth,
        })
    }

    pub fn init_edge_state(&self, graph: &MolGraph) -> Result<Tensor> {
        let src_feats = graph
            .atom_features
            .index_select(&graph.edge_index.get(0)?, 0)?;
        let edge_in = Tensor::cat(&[&src_feats, &graph.edge_attr], 1)?;
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
        let src_idx = graph.edge_index.get(0)?.to_vec1::<i64>()?;

        let incoming = scatter_sum(h, &dst_idx, graph.n_atoms)?;

        let mut messages = Vec::with_capacity(n_dir_edges);
        for edge_i in 0..n_dir_edges {
            let m_v = incoming.get(src_idx[edge_i] as usize)?.unsqueeze(0)?;
            let h_rev = h.get(rev_edge_index[edge_i])?.unsqueeze(0)?;
            messages.push((m_v - h_rev)?);
        }
        let messages = Tensor::cat(&messages, 0)?;
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
    (0..n_dir_edges)
        .map(|i| {
            edge_map
                .get(&(dst[i], src[i]))
                .copied()
                .ok_or_else(|| candle_core::Error::Msg("missing reverse edge".into()))
        })
        .collect()
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
        for _ in 0..cfg.ffn_num_layers {
            // ← was ffn_num_layers - 1
            dims.push(cfg.ffn_hidden_dim);
        }
        dims.push(cfg.num_tasks);
        // ffn_num_layers=2 → dims=[300,300,300,1] → layer_0,layer_1,layer_2 ✓
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
// DMPNN
// ---------------------------------------------------------------------------
pub struct DMPNN {
    conv: DMPNNConv,
    ffn: FFN,
    cfg: DMPNNConfig,
}

impl DMPNN {
    pub fn new(cfg: DMPNNConfig, vs: VarBuilder) -> Result<Self> {
        Ok(Self {
            conv: DMPNNConv::new(&cfg, vs.pp("conv"))?,
            ffn: FFN::new(&cfg, vs.pp("ffn"))?,
            cfg,
        })
    }

    pub fn forward(&self, graph: &MolGraph) -> Result<Tensor> {
        let rev = build_rev_edge_index(&graph.edge_index, graph.n_dir_edges)?;
        let h0 = self.conv.init_edge_state(graph)?;
        let mut h = h0.clone();
        for _ in 0..self.conv.depth {
            h = self.conv.step(&h, &h0, graph, &rev)?;
        }
        let node_h = self.conv.readout_nodes(&h, graph)?;
        let graph_h = node_h.sum(0)?.unsqueeze(0)?;
        let out = self
            .ffn
            .forward(&graph_h, self.cfg.task_type == "classification")?;
        out.squeeze(0)
    }
}

// ---------------------------------------------------------------------------
// Loss
// ---------------------------------------------------------------------------
fn mse_loss(pred: &Tensor, target: &Tensor) -> Result<Tensor> {
    let d = (pred - target)?;
    (&d * &d)?.mean_all()
}

// FIXED: clamp pred (already sigmoid-ed) away from 0/1 before log
fn bce_loss(pred: &Tensor, target: &Tensor) -> Result<Tensor> {
    // pred is already sigmoid output in [0,1]
    // clamp to avoid log(0) = -inf
    let eps = 1e-7f32;
    let p = pred.clamp(eps, 1.0 - eps)?;

    // log(p) and log(1-p)
    let log_p = p.log()?;
    let log_1mp = p.neg()?.affine(1.0, 1.0)?.log()?; // log(1 - p)

    // BCE = -[ y*log(p) + (1-y)*log(1-p) ]
    let term1 = (target * &log_p)?;
    let term2 = ((target.neg()?.affine(1.0, 1.0))? * &log_1mp)?; // (1-y)*log(1-p)
    let sum = (term1 + term2)?;

    // mean then negate → positive loss
    sum.mean_all()?.neg()
}

// ---------------------------------------------------------------------------
// SGD step — extracted so both train functions share it
// FIXED: returns Result so ? works cleanly
// ---------------------------------------------------------------------------
fn sgd_step(varmap: &VarMap, grads: &candle_core::backprop::GradStore, lr: f64) -> Result<()> {
    let mut data = varmap.data().lock().unwrap();
    for (_name, var) in data.iter_mut() {
        if let Some(grad) = grads.get(var.as_tensor()) {
            let clipped = grad.clamp(-1.0f32, 1.0f32)?;
            let scaled = clipped.affine(lr, 0.0)?;
            var.set(&(var.as_tensor() - scaled)?)?;
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Weight init
// ---------------------------------------------------------------------------
fn kaiming_init(shape: &[usize], device: &Device) -> Result<Tensor> {
    let fan_in = shape[shape.len() - 1];
    let std = (2.0 / fan_in as f32).sqrt();
    let n: usize = shape.iter().product();
    let mut vals = Vec::with_capacity(n);
    let mut seed: u32 = 42;
    for _ in 0..n {
        seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
        vals.push(((seed as f32 / u32::MAX as f32) * 2.0 - 1.0) * std);
    }
    Tensor::from_slice(&vals, shape, device)
}

fn init_varmap_weights(varmap: &VarMap, device: &Device) {
    let mut data = varmap.data().lock().unwrap();
    for (name, var) in data.iter_mut() {
        if name.contains("weight") {
            let shape = var.as_tensor().dims().to_vec();
            if let Ok(t) = kaiming_init(&shape, device) {
                let _ = var.set(&t);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Model handle
// ---------------------------------------------------------------------------
pub struct ModelHandle {
    model: DMPNN,
    varmap: VarMap,
    cfg: DMPNNConfig,
    device: Device,
}

// ---------------------------------------------------------------------------
// Weight serialisation (unchanged)
// ---------------------------------------------------------------------------
fn varmap_to_safetensors(varmap: &VarMap) -> Vec<u8> {
    let data = varmap.data().lock().unwrap();
    let mut owned: Vec<(String, safetensors::Dtype, Vec<usize>, Vec<u8>)> = Vec::new();
    for (name, var) in data.iter() {
        let t = var.as_tensor();
        let shape = t.dims().to_vec();
        let bytes: Vec<u8> = match t.flatten_all().and_then(|f| f.to_vec1::<f32>()) {
            Ok(vals) => vals.iter().flat_map(|f| f.to_le_bytes()).collect(),
            Err(_) => continue,
        };
        owned.push((name.clone(), safetensors::Dtype::F32, shape, bytes));
    }
    let views: HashMap<&str, safetensors::tensor::TensorView> = owned
        .iter()
        .filter_map(|(name, dtype, shape, bytes)| {
            safetensors::tensor::TensorView::new(*dtype, shape.clone(), bytes)
                .ok()
                .map(|v| (name.as_str(), v))
        })
        .collect();
    safetensors::tensor::serialize(&views, &None).unwrap_or_default()
}

fn load_into_varmap(varmap: &VarMap, bytes: &[u8], device: &Device) -> Result<()> {
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
#[wasm_bindgen]
pub fn model_new(config_json: &str) -> u64 {
    console_error_panic_hook::set_once();
    let cfg = serde_json::from_str(config_json).unwrap_or_default();
    let device = Device::Cpu;
    let varmap = VarMap::new();
    let vs = VarBuilder::from_varmap(&varmap, DType::F32, &device);
    let model = DMPNN::new(cfg, vs).expect("model build failed");
    init_varmap_weights(&varmap, &device);
    Box::into_raw(Box::new(ModelHandle {
        cfg: model.cfg.clone(),
        model,
        varmap,
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
    let run = || -> Result<f32> {
        let graph = MolGraph::from_slices(
            atom_features,
            (n_atoms, h.cfg.atom_dim),
            edge_index,
            (2, n_dir_edges),
            edge_attr,
            (n_dir_edges, h.cfg.bond_dim),
            &h.device,
        )?;

        let pred = h.model.forward(&graph)?;
        println!("pred: {:?}", pred.to_vec1::<f32>()); // ← add

        let target = Tensor::from_slice(labels, (labels.len(),), &h.device)?;
        println!("target: {:?}", target.to_vec1::<f32>()); // ← add

        let loss = if h.cfg.task_type == "classification" {
            let l = bce_loss(&pred, &target)?;
            println!("BCE loss: {}", l.to_scalar::<f32>()?); // ← add
            l
        } else {
            let l = mse_loss(&pred, &target)?;
            println!("MSE loss: {}", l.to_scalar::<f32>()?); // ← add
            l
        };

        let grads = loss.backward()?;
        sgd_step(&h.varmap, &grads, lr)?;
        loss.to_scalar::<f32>()
    };
    match run() {
        Ok(loss) => {
            println!("Returning loss: {}", loss); // ← final check
            loss
        }
        Err(e) => {
            eprintln!("Train step failed: {:?}", e);
            f32::NAN
        }
    }
}

// FIXED: removed double forward, fixed edge_index slicing, ? in Result closure
#[wasm_bindgen]
pub fn model_train_step_batch(
    handle: u64,
    mol_atom_features: &[f32],
    mol_n_atoms: &[usize],
    mol_edge_index: &[i64],
    mol_n_dir_edges: &[usize],
    mol_edge_attr: &[f32],
    labels: &[f32],
    lr: f64,
) -> f32 {
    let h = unsafe { &mut *(handle as *mut ModelHandle) };
    let run = || -> Result<f32> {
        let n_mols = mol_n_atoms.len();
        let mut atom_offsets = vec![0usize; n_mols + 1];
        let mut edge_offsets = vec![0usize; n_mols + 1];
        for i in 0..n_mols {
            atom_offsets[i + 1] = atom_offsets[i] + mol_n_atoms[i];
            edge_offsets[i + 1] = edge_offsets[i] + mol_n_dir_edges[i];
        }

        let mut total_loss = 0f32;
        for mol_i in 0..n_mols {
            // FIXED: atom slice = offset * atom_dim (flat row-major)
            let a_start = atom_offsets[mol_i] * h.cfg.atom_dim;
            let a_end = atom_offsets[mol_i + 1] * h.cfg.atom_dim;
            // FIXED: edge_attr slice = offset * bond_dim
            let ea_start = edge_offsets[mol_i] * h.cfg.bond_dim;
            let ea_end = edge_offsets[mol_i + 1] * h.cfg.bond_dim;
            // FIXED: edge_index is (2, total_edges) flat; each row = total_edges long
            // slice is [offset .. offset+n_dir_edges] for each row
            // but JS sends it as [all_srcs | all_dsts]; Rust sees a flat (2*total) slice.
            // We extract via: row0 = [0..total_edges], row1 = [total_edges..2*total_edges]
            // so per-mol: row0[edge_offsets[i]..edge_offsets[i+1]] etc.
            // The simplest layout for Rust: just pass the raw flat slice
            // and compute per-mol as a sub-tensor. We can't easily do that
            // without building the tensor first, so we rebuild from two row slices:
            let total_edges = edge_offsets[n_mols];
            let ei_row0_start = edge_offsets[mol_i];
            let ei_row0_end = edge_offsets[mol_i + 1];
            let ei_row1_start = total_edges + edge_offsets[mol_i];
            let ei_row1_end = total_edges + edge_offsets[mol_i + 1];

            let n_e = mol_n_dir_edges[mol_i];
            let mut ei_mol = vec![0i64; 2 * n_e];
            ei_mol[..n_e].copy_from_slice(&mol_edge_index[ei_row0_start..ei_row0_end]);
            ei_mol[n_e..].copy_from_slice(&mol_edge_index[ei_row1_start..ei_row1_end]);

            // Subtract atom offset so indices are local (0-based per molecule)
            let atom_off = atom_offsets[mol_i] as i64;
            for v in ei_mol.iter_mut() {
                *v -= atom_off;
            }

            let graph = MolGraph::from_slices(
                &mol_atom_features[a_start..a_end],
                (mol_n_atoms[mol_i], h.cfg.atom_dim),
                &ei_mol,
                (2, n_e),
                &mol_edge_attr[ea_start..ea_end],
                (n_e, h.cfg.bond_dim),
                &h.device,
            )?;

            let pred = h.model.forward(&graph)?;
            let target = Tensor::from_slice(&[labels[mol_i]], (1,), &h.device)?;
            let loss = if h.cfg.task_type == "classification" {
                bce_loss(&pred, &target)?
            } else {
                mse_loss(&pred, &target)?
            };
            let grads = loss.backward()?;
            sgd_step(&h.varmap, &grads, lr)?;
            total_loss += loss.to_scalar::<f32>().unwrap_or(0.0);
        }
        Ok(total_loss / n_mols as f32)
    };
    run().unwrap_or(f32::NAN)
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
    let run = || -> Result<Vec<f32>> {
        let graph = MolGraph::from_slices(
            atom_features,
            (n_atoms, h.cfg.atom_dim),
            edge_index,
            (2, n_dir_edges),
            edge_attr,
            (n_dir_edges, h.cfg.bond_dim),
            &h.device,
        )?;
        h.model.forward(&graph)?.to_vec1::<f32>()
    };
    run().unwrap_or_default()
}

#[wasm_bindgen]
pub fn model_get_weights(handle: u64) -> Vec<u8> {
    let h = unsafe { &*(handle as *const ModelHandle) };
    varmap_to_safetensors(&h.varmap)
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
// K-Fold (unchanged logic, uses fixed sgd_step + bce_loss)
// ---------------------------------------------------------------------------
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

#[wasm_bindgen]
pub fn model_train_kfold(
    handle: u64,
    mol_atom_features: &[f32],
    mol_n_atoms: &[usize],
    mol_edge_index: &[i64],
    mol_n_dir_edges: &[usize],
    mol_edge_attr: &[f32],
    labels: &[f32],
    n_splits: usize,
    epochs_per_fold: usize,
    lr: f64,
) -> JsValue {
    let h = unsafe { &mut *(handle as *mut ModelHandle) };
    let n_mols = mol_n_atoms.len();
    let is_cls = h.cfg.task_type == "classification";

    let mut atom_offsets = vec![0usize; n_mols + 1];
    let mut edge_offsets = vec![0usize; n_mols + 1];
    for i in 0..n_mols {
        atom_offsets[i + 1] = atom_offsets[i] + mol_n_atoms[i];
        edge_offsets[i + 1] = edge_offsets[i] + mol_n_dir_edges[i];
    }
    let total_edges = edge_offsets[n_mols];

    // Build per-mol edge index as local (0-based) slices once
    // so we don't recompute every epoch
    let mol_ei_local: Vec<Vec<i64>> = (0..n_mols)
        .map(|mol_i| {
            let n_e = mol_n_dir_edges[mol_i];
            let r0_s = edge_offsets[mol_i];
            let r1_s = total_edges + edge_offsets[mol_i];
            let off = atom_offsets[mol_i] as i64;
            let mut ei = vec![0i64; 2 * n_e];
            ei[..n_e].copy_from_slice(&mol_edge_index[r0_s..r0_s + n_e]);
            ei[n_e..].copy_from_slice(&mol_edge_index[r1_s..r1_s + n_e]);
            for v in ei.iter_mut() {
                *v -= off;
            }
            ei
        })
        .collect();

    let build_graph = |mol_i: usize, device: &Device| -> Result<MolGraph> {
        let a_s = atom_offsets[mol_i] * h.cfg.atom_dim;
        let a_e = atom_offsets[mol_i + 1] * h.cfg.atom_dim;
        let ea_s = edge_offsets[mol_i] * h.cfg.bond_dim;
        let ea_e = edge_offsets[mol_i + 1] * h.cfg.bond_dim;
        MolGraph::from_slices(
            &mol_atom_features[a_s..a_e],
            (mol_n_atoms[mol_i], h.cfg.atom_dim),
            &mol_ei_local[mol_i],
            (2, mol_n_dir_edges[mol_i]),
            &mol_edge_attr[ea_s..ea_e],
            (mol_n_dir_edges[mol_i], h.cfg.bond_dim),
            device,
        )
    };

    let fold_size = n_mols / n_splits;
    let mut fold_metrics: Vec<Vec<f32>> = Vec::new();
    let mut per_fold_preds: Vec<Vec<PredPoint>> = Vec::new();

    for fold in 0..n_splits {
        let test_start = fold * fold_size;
        let test_end = if fold == n_splits - 1 {
            n_mols
        } else {
            test_start + fold_size
        };
        let train_idx: Vec<usize> = (0..n_mols)
            .filter(|&i| i < test_start || i >= test_end)
            .collect();
        let test_idx: Vec<usize> = (test_start..test_end).collect();

        let fold_varmap = VarMap::new();
        let fold_vs = VarBuilder::from_varmap(&fold_varmap, DType::F32, &h.device);
        let fold_model = DMPNN::new(h.cfg.clone(), fold_vs).expect("fold model");
        init_varmap_weights(&fold_varmap, &h.device);

        for _epoch in 0..epochs_per_fold {
            for &mol_i in &train_idx {
                let Ok(graph) = build_graph(mol_i, &h.device) else {
                    continue;
                };
                let Ok(pred) = fold_model.forward(&graph) else {
                    continue;
                };
                let Ok(target) = Tensor::from_slice(&[labels[mol_i]], (1,), &h.device) else {
                    continue;
                };
                let Ok(loss) = (if is_cls {
                    bce_loss(&pred, &target)
                } else {
                    mse_loss(&pred, &target)
                }) else {
                    continue;
                };
                let Ok(grads) = loss.backward() else { continue };
                let _ = sgd_step(&fold_varmap, &grads, lr);
            }
        }

        let mut preds_test = Vec::new();
        for &mol_i in &test_idx {
            let p = build_graph(mol_i, &h.device)
                .and_then(|g| fold_model.forward(&g))
                .and_then(|t| t.to_vec1::<f32>())
                .ok()
                .and_then(|v| v.into_iter().next())
                .unwrap_or(f32::NAN);
            preds_test.push(p);
        }

        let fold_labels: Vec<f32> = test_idx.iter().map(|&i| labels[i]).collect();
        let metric = if is_cls {
            let acc = preds_test
                .iter()
                .zip(&fold_labels)
                .filter(|(&p, &y)| (p >= 0.5) == (y >= 0.5))
                .count() as f32
                / fold_labels.len() as f32;
            vec![acc, approx_auroc(&fold_labels, &preds_test)]
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
            test_idx
                .iter()
                .zip(&preds_test)
                .map(|(&mol_i, &pred)| PredPoint {
                    y: labels[mol_i],
                    pred,
                    mol_idx: mol_i,
                })
                .collect(),
        );
    }

    serde_wasm_bindgen::to_value(&KFoldResult {
        fold_metrics,
        per_fold_preds,
    })
    .unwrap_or(JsValue::NULL)
}
