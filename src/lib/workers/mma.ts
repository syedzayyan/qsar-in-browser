import { ksTest } from '$lib/components/utils/ksTest';
console.log('MMA Worker Activated');

const rdkitScriptUrl = new URL('/rdkit/RDKit_minimal.js', self.location.origin).href;
const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;

self.onmessage = async (event) => {
	// Dynamic import for the RDKit script
	await import(/* @vite-ignore */ rdkitScriptUrl);
	initRDKitModule({
		locateFile: () => rdkitWasmUrl
	}).then((RDKitInstance) => {
		self.postMessage({ message: RDKitInstance.version() + 'Loaded' });
		self.postMessage({ message: 'Churning Out Scaffolds' });

		const row_list_s = event.data;
		const activity_name = Object.keys(row_list_s[0])[0];
		const curr_activity_column = row_list_s.map((obj: string) => obj[activity_name]);
		const massive_array = [];
		const length_row_list = row_list_s.length;

		row_list_s.map((x, i) => {
            self.postMessage({ message : `Decomposing SMILES: ${Math.round((i / length_row_list) * 100)} %`})
			try {
				const mol = RDKitInstance.get_mol(x.canonical_smiles);
				const sidechains_smiles_list = [];
				const cores_smiles_list = [];
				try {
					const mol_frags = mol.get_mmpa_frags(1, 1, 20);
					while (!mol_frags.sidechains.at_end()) {
						const m = mol_frags.sidechains.next();
						const { molList } = m.get_frags();
						try {
							const fragments = [];
							while (!molList.at_end()) {
								const m_frag = molList.next();
								fragments.push(m_frag.get_smiles());
								m_frag.delete();
							}
							cores_smiles_list.push(fragments.at(0));
							sidechains_smiles_list.push(fragments.at(1));

							const qmol = RDKitInstance.get_qmol(fragments.at(0));
							const mdetails2 = JSON.parse(mol.get_substruct_match(qmol));

							massive_array.push([
								x.canonical_smiles,
								fragments.at(0),
								mol.get_svg_with_highlights(JSON.stringify(mdetails2)),
								x.id,
								x[activity_name]
							]);

							qmol.delete();
						} catch {
							console.error('For Some Reason There are Null Values');
						}
						m.delete();
						molList.delete();
					}
					mol_frags.cores.delete();
					mol_frags.sidechains.delete();
				} catch (e) {
					console.error('Problem: ', e);
				}
				row_list_s[i]['Cores'] = cores_smiles_list;
				row_list_s[i]['R_Groups'] = sidechains_smiles_list;
				mol.delete();
			} catch (e) {
				console.error('Stuff Happened :( : ' + e);
			}
		});
        self.postMessage( {message : "Done Decomposing"} )
		const countArray = {};

		for (let i = 0; i < massive_array.length; i++) {
			if (massive_array[i].length >= 5) {
				// Ensure there are at least 5 elements in the subarray
				const secondElement = massive_array[i][1];
				const fifthElement = massive_array[i][4]; // Assuming the fifth element is at index 4

				if (!countArray[secondElement]) {
					countArray[secondElement] = [0, []];
				}

				countArray[secondElement][0]++;
				countArray[secondElement][1].push(fifthElement);
			}
		}

        self.postMessage( {message : "Sorting Arrays using KS Statistics"} )
		const scaffoldArray = Object.entries(countArray);
		let filteredArrayOfScaffolds = scaffoldArray.filter(
			([key, count]) => typeof count[0] === 'number' && count[0] >= 2 && key.length > 9
		);

        const filter_len = filteredArrayOfScaffolds.length;
		filteredArrayOfScaffolds = filteredArrayOfScaffolds.map((x, i) => {
            self.postMessage({ message : `Calculating KS Statistics: ${Math.round(i / filter_len)} %`})
			return [x[0], [x[1][0], ksTest(x[1][1], curr_activity_column)], (RDKitInstance.get_mol(x[0])).get_svg()];
		});

		filteredArrayOfScaffolds.sort((a, b) => a[1][1] - b[1][1]);

		const scaffoldResult =  [filteredArrayOfScaffolds, massive_array];

		self.postMessage({ message: 'Done....' });
		self.postMessage({ data: scaffoldResult });
	});
};
