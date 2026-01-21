
#!/usr/bin/env python3
import requests
import pandas as pd
from rdkit import Chem
from rdkit.Chem import DataStructs
import numpy as np
import ssl
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = 'https://repo-hub-qa.broadinstitute.org/public/data/repo-sample-annotation-20240610.txt'

print('📥 Downloading...')
r = requests.get(url, timeout=30, verify=False)
r.raise_for_status()

# Skip metadata, find real header
lines = r.text.splitlines()
data_lines = []
header_found = False
header = None

for i, line in enumerate(lines):
    if line.startswith('!'):
        continue
    if not header_found and line.strip():
        header = [h.strip('"') for h in line.split('\t')]
        header_found = True
        print(f'✅ Header (line {i+1}): {header[:5]}...')
        continue
    if header_found and line.strip():
        data_lines.append([field.strip('"') for field in line.split('\t')])

print(f'Parsed {len(data_lines)} data rows')

# Column indices
header_lower = [h.lower() for h in header]
broad_idx = header_lower.index('broad_id')
smiles_idx = header_lower.index('smiles')
name_idx = header_lower.index('pert_iname')

print(f'broad_id[{broad_idx}], smiles[{smiles_idx}], name[{name_idx}]')

# Build DataFrame
data = []
for row in data_lines:
    if len(row) > max(broad_idx, smiles_idx, name_idx):
        data.append({
            'broad_id': row[broad_idx],
            'name': row[name_idx],
            'canonical_smiles': row[smiles_idx]
        })

df = pd.DataFrame(data)
print(f'Raw: {len(df)} rows')

# Clean SMILES
def clean_smiles(s):
    if pd.isna(s) or not s or s == 'nan':
        return None
    try:
        mol = Chem.MolFromSmiles(s)
        if mol is None:
            return None
        Chem.SanitizeMol(mol)
        return Chem.MolToSmiles(mol, canonical=True)
    except:
        return None

df['clean_smiles'] = df['canonical_smiles'].apply(clean_smiles)
df = df.dropna(subset=['clean_smiles']).drop_duplicates('clean_smiles')
print(f'Cleaned: {len(df)} valid SMILES')

df.to_csv('cleaned_compounds.csv', index=False)
print('✅ Saved cleaned_compounds.csv')