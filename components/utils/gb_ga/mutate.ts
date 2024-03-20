import _ from "lodash";

function selectChoice(choices: any[], probabilities: any[]) {
    let randomNumber = Math.random();
    let cumulativeProbability = 0;

    for (let i = 0; i < choices.length; i++) {
        cumulativeProbability += probabilities[i];
        if (randomNumber <= cumulativeProbability) {
            return choices[i];
        }
    }
}

const range = n => Array.from({ length: n }, (_, i) => i);

function deleteAtom() {
    const choices = ['[*:1]~[D1]>>[*:1]', '[*:1]~[D2]~[*:2]>>[*:1]-[*:2]',
        '[*:1]~[D3](~[*;!H0:2])~[*:3]>>[*:1]-[*:2]-[*:3]',
        '[*:1]~[D4](~[*;!H0:2])(~[*;!H0:3])~[*:4]>>[*:1]-[*:2]-[*:3]-[*:4]',
        '[*:1]~[D4](~[*;!H0;!H1:2])(~[*:3])~[*:4]>>[*:1]-[*:2](-[*:3])-[*:4]'];
    const p = [0.25, 0.25, 0.25, 0.1875, 0.0625];
    return selectChoice(choices, p);
}

function appendAtom() {
    const choices = [['single', ['C', 'N', 'O', 'F', 'S', 'Cl', 'Br'], 7 * (1.0 / 7.0)],
    ['double', ['C', 'N', 'O'], 3 * (1.0 / 3.0)],
    ['triple', ['C', 'N'], 2 * (1.0 / 2.0)]];
    const p_BO = [0.60, 0.35, 0.05];

    const index = selectChoice(range(3), p_BO);
    const [BO, atom_list, p] = choices[index];

    const newAtom = selectChoice([atom_list], [p]);

    let rxn_smarts;

    if (BO == 'single') {
        rxn_smarts = '[*;!H0:1]>>[*:1]X'.replace('X', '-' + newAtom)
    }
    if (BO == 'double') {
        rxn_smarts = '[*;!H0;!H1:1]>>[*:1]X'.replace('X', '=' + newAtom)
    }

    if (BO == 'triple') {
        rxn_smarts = '[*;H3:1]>>[*:1]X'.replace('X', '#' + newAtom)
    }
    return rxn_smarts;
}

function insertAtom() {
    const choices = [['single', ['C', 'N', 'O', 'S'], [1.0 / 4.0]],
    ['double', ['C', 'N'], [1.0 / 2.0]],
    ['triple', ['C'], [1.0]]];
    const p_BO = [0.60, 0.35, 0.05];

    const index = selectChoice(range(3), p_BO);
    const [BO, atom_list, p] = choices[index];

    const newAtom = selectChoice([atom_list], [p]);

    let rxn_smarts;

    if (BO == 'single') {
        rxn_smarts = '[*:1]~[*:2]>>[*:1]X[*:2]'.replace('X', newAtom)
    }
    if (BO == 'double') {
        rxn_smarts = '[*;!H0:1]~[*:2]>>[*:1]=X-[*:2]'.replace('X', newAtom)
    }

    if (BO == 'triple') {
        rxn_smarts = '[*;!R;!H1;!H0:1]~[*:2]>>[*:1]#X-[*:2]'.replace('X', newAtom)
    }
    return rxn_smarts;
}

function changeBondOrder() {
    const choices = ['[*:1]!-[*:2]>>[*:1]-[*:2]', '[*;!H0:1]-[*;!H0:2]>>[*:1]=[*:2]',
        '[*:1]#[*:2]>>[*:1]=[*:2]', '[*;!R;!H1;!H0:1]~[*:2]>>[*:1]#[*:2]']
    const p = [0.45, 0.45, 0.05, 0.05]
    return selectChoice(choices, p)
}

function deleteCyclicBond() {
    return '[*:1]@[*:2]>>([*:1].[*:2])'
}

function addRing() {
    const choices = ['[*;!r;!H0:1]~[*;!r:2]~[*;!r;!H0:3]>>[*:1]1~[*:2]~[*:3]1',
        '[*;!r;!H0:1]~[*!r:2]~[*!r:3]~[*;!r;!H0:4]>>[*:1]1~[*:2]~[*:3]~[*:4]1',
        '[*;!r;!H0:1]~[*!r:2]~[*:3]~[*:4]~[*;!r;!H0:5]>>[*:1]1~[*:2]~[*:3]~[*:4]~[*:5]1',
        '[*;!r;!H0:1]~[*!r:2]~[*:3]~[*:4]~[*!r:5]~[*;!r;!H0:6]>>[*:1]1~[*:2]~[*:3]~[*:4]~[*:5]~[*:6]1']
    const p = [0.05, 0.05, 0.45, 0.45]
    return selectChoice(choices, p)
}

function changeAtom(mol: any, rdkit: any) {
    const choices = ['#6', '#7', '#8', '#9', '#16', '#17', '#35']
    const p = [0.15, 0.15, 0.14, 0.14, 0.14, 0.14, 0.14]

    let X = selectChoice(choices, p);
    let Y

    while (!mol.get_substruct_match(rdkit.get_mol('[' + X + ']'))){
        X = selectChoice(choices, p)
        Y = selectChoice(choices, p)        
    }

    while (Y == X){
        Y = selectChoice(choices, p)
    }
        
    return '[X:1]>>[Y:1]'.replace('X', X).replace('Y', Y)
}

function mutate(mol: any, mutation_rate: number, rdkit: any) {
    if (Math.random() > mutation_rate) {
        return mol;
    }
    mol = rdkit.get_mol(mol.get_smiles(), JSON.stringify({ kekulize: false }));
    const p = [0.15, 0.14, 0.14, 0.14, 0.14, 0.14, 0.15];
    for (let i = 0; i < 10; i++) {
        const rxn_smarts_list = ['', '', '', '', '', '', ''];
        rxn_smarts_list[0] = insertAtom();
        rxn_smarts_list[1] = changeBondOrder();
        rxn_smarts_list[2] = deleteCyclicBond();
        rxn_smarts_list[3] = addRing();
        rxn_smarts_list[4] = deleteAtom();
        rxn_smarts_list[5] = changeAtom(mol, rdkit);
        rxn_smarts_list[6] = appendAtom();
        const rxn_smarts = selectChoice(rxn_smarts_list, p);

        //console.log('mutation', rxn_smarts);

        const rxn = rdkit.get_rxn(rxn_smarts);

        const new_mol_trial = rxn.RunReactants([mol]);

        const new_mols = [];
        for (const m of new_mol_trial) {
            const new_mol = m[0];
            //console.log Chem.MolToSmiles(mol),mol_OK(mol);
            if (mol_OK(new_mol) && ring_OK(new_mol)) {
                new_mols.push(new_mol);
            }
        }

        if (new_mols.length > 0) {
            return _.sample(new_mols);
        }
    }

    return null;
}