import _ from 'lodash';
import { initRDKit } from '../rdkit_loader';
const rdkit = await initRDKit();

function cut(mol){
    if (!mol.HasSubstructMatch(('[*]-;!@[*]'))) {
        return null;
    }
    const bis = _.choice(mol.GetSubstructMatches(rdkit.get_mol('[*]-;!@[*]')));
    const bs = [mol.GetBondBetweenAtoms(bis[0], bis[1]).GetIdx()];

    const fragments_mol = Chem.FragmentOnBonds(mol, bs, true, [(1, 1)]);

    try {
        const fragments = Chem.GetMolFrags(fragments_mol, true);
        return fragments;
    } catch {
        return null;
    }
}

function cut_ring(mol: Mol): Mol[] | null {
    for (let i = 0; i < 10; i++) {
        if (random.random() < 0.5) {
            if (!mol.HasSubstructMatch(Chem.MolFromSmarts('[R]@[R]@[R]@[R]'))) {
                return null;
            }
            const bis = random.choice(mol.GetSubstructMatches(Chem.MolFromSmarts('[R]@[R]@[R]@[R]')));
            bis = ((bis[0], bis[1]), (bis[2], bis[3]));
        } else {
            if (!mol.HasSubstructMatch(Chem.MolFromSmarts('[R]@[R;!D2]@[R]'))) {
                return null;
            }
            const bis = random.choice(mol.GetSubstructMatches(Chem.MolFromSmarts('[R]@[R;!D2]@[R]')));
            bis = ((bis[0], bis[1]), (bis[1], bis[2]));
        }

        const bs = [mol.GetBondBetweenAtoms(x, y).GetIdx() for x, y in bis];

        const fragments_mol = Chem.FragmentOnBonds(mol, bs, true, [(1, 1), (1, 1)]);

        try {
            const fragments = Chem.GetMolFrags(fragments_mol, true);
            return fragments;
        } catch {
            return null;
        }

        if (fragments.length === 2) {
            return fragments;
        }
    }

    return null;
}

function ring_OK(mol: Mol): boolean {
    if (!mol.HasSubstructMatch(Chem.MolFromSmarts('[R]'))) {
        return true;
    }

    const ring_allene = mol.HasSubstructMatch(Chem.MolFromSmarts('[R]=[R]=[R]'));

    const cycle_list = mol.GetRingInfo().AtomRings();
    const max_cycle_length = Math.max(...cycle_list.map((j) => j.length));
    const macro_cycle = max_cycle_length > 6;

    const double_bond_in_small_ring = mol.HasSubstructMatch(Chem.MolFromSmarts('[r3,r4]=[r3,r4]'));

    return !ring_allene && !macro_cycle && !double_bond_in_small_ring;
}

function mol_OK(mol: Mol): boolean {
    try {
        Chem.SanitizeMol(mol);
        const test_mol = Chem.MolFromSmiles(Chem.MolToSmiles(mol));
        if (test_mol === null) {
            return false;
        }
        const target_size = size_stdev * np.random.randn() + average_size;
        if (mol.GetNumAtoms() > 5 && mol.GetNumAtoms() < target_size) {
            return true;
        } else {
            return false;
        }
    } catch {
        return false;
    }
}

function crossover_ring(parent_A: Mol, parent_B: Mol): Mol | null {
    const ring_smarts = Chem.MolFromSmarts('[R]');
    if (!parent_A.HasSubstructMatch(ring_smarts) && !parent_B.HasSubstructMatch(ring_smarts)) {
        return null;
    }

    const rxn_smarts1 = ['[*:1]~[1*].[1*]~[*:2]>>[*:1]-[*:2]', '[*:1]~[1*].[1*]~[*:2]>>[*:1]=[*:2]'];
    const rxn_smarts2 = ['([*:1]~[1*].[1*]~[*:2])>>[*:1]-[*:2]', '([*:1]~[1*].[1*]~[*:2])>>[*:1]=[*:2]'];
    for (let i = 0; i < 10; i++) {
        const fragments_A = cut_ring(parent_A);
        const fragments_B = cut_ring(parent_B);
        if (fragments_A === null || fragments_B === null) {
            return null;
        }

        let new_mol_trial = [];
        for (const rs of rxn_smarts1) {
            const rxn1 = AllChem.ReactionFromSmarts(rs);
            new_mol_trial = [];
            for (const fa of fragments_A) {
                for (const fb of fragments_B) {
                    new_mol_trial.push(rxn1.RunReactants((fa, fb))[0]);
                }
            }
        }

        const new_mols = [];
        for (const rs of rxn_smarts2) {
            const rxn2 = AllChem.ReactionFromSmarts(rs);
            for (const m of new_mol_trial) {
                const mol = m[0];
                if (mol_OK(mol)) {
                    new_mols += list(rxn2.RunReactants((mol,)));
                }
            }
        }

        const new_mols2 = [];
        for (const m of new_mols) {
            const mol = m[0];
            if (mol_OK(mol) && ring_OK(mol)) {
                new_mols2.push(mol);
            }
        }

        if (new_mols2.length > 0) {
            return random.choice(new_mols2);
        }
    }

    return null;
}

function crossover_non_ring(parent_A: Mol, parent_B: Mol): Mol | null {
    for (let i = 0; i < 10; i++) {
        const fragments_A = cut(parent_A);
        const fragments_B = cut(parent_B);
        if (fragments_A === null || fragments_B === null) {
            return null;
        }
        const rxn = AllChem.ReactionFromSmarts('[*:1]-[1*].[1*]-[*:2]>>[*:1]-[*:2]');
        const new_mol_trial = [];
        for (const fa of fragments_A) {
            for (const fb of fragments_B) {
                new_mol_trial.push(rxn.RunReactants((fa, fb))[0]);
            }
        }

        const new_mols = [];
        for (const mol of new_mol_trial) {
            const m = mol[0];
            if (mol_OK(m)) {
                new_mols.push(m);
            }
        }

        if (new_mols.length > 0) {
            return random.choice(new_mols);
        }
    }

    return null;
}

function crossover(parent_A: Mol, parent_B: Mol): Mol | null {
    const parent_smiles = [Chem.MolToSmiles(parent_A), Chem.MolToSmiles(parent_B)];
    try {
        Chem.Kekulize(parent_A, true);
        Chem.Kekulize(parent_B, true);
    } catch {
        // pass
    }
    for (let i = 0; i < 10; i++) {
        if (random.random() <= 0.5) {
            const new_mol = crossover_non_ring(parent_A, parent_B);
            if (new_mol !== null) {
                const new_smiles = Chem.MolToSmiles(new_mol);
                if (new_mol !== null && !parent_smiles.includes(new_smiles)) {
                    return new_mol;
                }
            }
        } else {
            const new_mol = crossover_ring(parent_A, parent_B);
            if (new_mol !== null) {
                const new_smiles = Chem.MolToSmiles(new_mol);
                if (new_mol !== null && !parent_smiles.includes(new_smiles)) {
                    return new_mol;
                }
            }
        }
    }

    return null;
}

// const smiles1 = 'CC(C)(C)c1ccc2occ(CC(=O)Nc3ccccc3F)c2c1';
// const smiles2 = 'C[C@@H]1CC(Nc2cncc(-c3nncn3C)c2)C[C@@H](C)C1';

// const mol1 = Chem.MolFromSmiles(smiles1);
// const mol2 = Chem.MolFromSmiles(smiles2);

// const child = crossover(mol1, mol2);
// const mutation_rate = 1.0;
// // const mutated_child = mutate(child, mutation_rate);

// for (let i = 0; i < 100; i++) {
//     const child = crossover(mol1, mol2);
// }