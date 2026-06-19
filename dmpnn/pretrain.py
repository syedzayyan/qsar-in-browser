# pretrain.py

import os
import random

import lightning as L
import numpy as np
import pandas as pd
import torch

# Chemprop imports (v2+ style)
from chemprop.data import MoleculeDatapoint, MoleculeDataset, build_dataloader
from chemprop.models import MPNN
from chemprop.nn import BondMessagePassing, MeanAggregation, RegressionFFN
from rdkit import Chem
from rdkit.Chem import Descriptors
from safetensors.torch import save_file

# ─────────────────────────────────────────────────────────────────────────────
# 0. Reproducibility
# ─────────────────────────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Load dataset
# ─────────────────────────────────────────────────────────────────────────────
DATA_PATH = "zinc250k.smiles"

if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(
        "Download dataset first:\n"
        "wget https://raw.githubusercontent.com/datamol-io/datamol/main/datamol/data/chembl_drugs.csv"
    )

df = pd.read_csv(DATA_PATH)
smiles_list = df["smiles"].dropna().tolist()

print(f"Loaded {len(smiles_list)} SMILES")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Compute labels (logP example)
# ─────────────────────────────────────────────────────────────────────────────
def get_label(smi):
    mol = Chem.MolFromSmiles(smi)
    if mol is None:
        return None
    return Descriptors.MolLogP(mol)


records = []
for smi in smiles_list:
    y = get_label(smi)
    if y is not None:
        records.append((smi, y))

print(f"{len(records)} valid molecules")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Train / Val split
# ─────────────────────────────────────────────────────────────────────────────
random.shuffle(records)
split_idx = int(0.9 * len(records))

train_records = records[:split_idx]
val_records = records[split_idx:]

print(f"Train: {len(train_records)} | Val: {len(val_records)}")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Build datasets
# ─────────────────────────────────────────────────────────────────────────────
def make_dataset(records):
    datapoints = []

    for smi, y in records:
        dp = MoleculeDatapoint.from_smi(smi)
        dp.y = [y]  # ← THIS is the key fix
        datapoints.append(dp)

    return MoleculeDataset(datapoints)


train_dataset = make_dataset(train_records)
val_dataset = make_dataset(val_records)

train_loader = build_dataloader(
    train_dataset,
    batch_size=64,
    shuffle=True,
)

val_loader = build_dataloader(
    val_dataset,
    batch_size=64,
    shuffle=False,
)

# ─────────────────────────────────────────────────────────────────────────────
# 5. Model
# ─────────────────────────────────────────────────────────────────────────────
HIDDEN_DIM = 300

mp = BondMessagePassing(depth=3, d_h=HIDDEN_DIM)
agg = MeanAggregation()

ffn = RegressionFFN(
    input_dim=HIDDEN_DIM,
    hidden_dim=HIDDEN_DIM,
    n_layers=2,
    n_tasks=1,
)

model = MPNN(
    message_passing=mp,
    agg=agg,
    predictor=ffn,
)

# ─────────────────────────────────────────────────────────────────────────────
# 6. Training
# ─────────────────────────────────────────────────────────────────────────────
trainer = L.Trainer(
    max_epochs=10,  # fewer epochs, more data
    accelerator="mps",
    devices=1,
    precision="16-mixed",  # faster, same quality
    log_every_n_steps=50,
)


trainer.fit(
    model,
    train_dataloaders=train_loader,
    val_dataloaders=val_loader,
)

# ─────────────────────────────────────────────────────────────────────────────
# 7. Remap Chemprop keys → Candle VarMap keys
# ─────────────────────────────────────────────────────────────────────────────
# Chemprop key              →  Candle VarMap key (from your lib.rs VarBuilder paths)
# message_passing.W_i.*    →  conv.w_i.*
# message_passing.W_h.*    →  conv.w_h.*
# message_passing.W_o.*    →  conv.w_o.*
# predictor.ffn.0.0.*      →  ffn.ffn.layer_0.*   (first FFN layer)
# predictor.ffn.1.2.*      →  ffn.ffn.layer_1.*
# predictor.ffn.2.2.*      →  ffn.ffn.layer_2.*


def remap_keys(state: dict) -> dict:
    remapped = {}
    for k, v in state.items():
        # message passing
        if k.startswith("message_passing.W_i"):
            new_k = k.replace("message_passing.W_i", "conv.w_i")
        elif k.startswith("message_passing.W_h"):
            new_k = k.replace("message_passing.W_h", "conv.w_h")
        elif k.startswith("message_passing.W_o"):
            new_k = k.replace("message_passing.W_o", "conv.w_o")
        # FFN layers — chemprop uses 0.0 / 1.2 / 2.2 (skip+relu pattern)
        elif "predictor.ffn.0.0" in k:
            new_k = k.replace("predictor.ffn.0.0", "ffn.ffn.layer_0")
        elif "predictor.ffn.1.2" in k:
            new_k = k.replace("predictor.ffn.1.2", "ffn.ffn.layer_1")
        elif "predictor.ffn.2.2" in k:
            new_k = k.replace("predictor.ffn.2.2", "ffn.ffn.layer_2")
        else:
            print(f"  [SKIP] unmapped key: {k}")
            continue
        remapped[new_k] = v
    return remapped


state = model.state_dict()
state = {k: v.detach().cpu().float() for k, v in state.items()}

remapped = remap_keys(state)
print("\nRemapped keys:")
for k in remapped:
    print(" ", k)

save_file(remapped, "pretrained_chemprop.safetensors")
