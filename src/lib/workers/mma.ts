function scaffoldArrayGetter(row_list_s) {
	let curr_activity_column = ligand.map((obj) => obj[target.activity_columns[0]]);
	let massive_array = [];

	row_list_s.map((x, i) => {
		const mol = RDKit.get_mol(x.canonical_smiles);
		let sidechains_smiles_list = [];
		let cores_smiles_list = [];
		try {
			const mol_frags = mol.get_mmpa_frags(1, 1, 20);
			while (!mol_frags.sidechains.at_end()) {
				var m = mol_frags.sidechains.next();
				var { molList, _ } = m.get_frags();
				try {
					let fragments = [];
					while (!molList.at_end()) {
						var m_frag = molList.next();
						fragments.push(m_frag.get_smiles());
						m_frag.delete();
					}
					cores_smiles_list.push(fragments.at(0));
					sidechains_smiles_list.push(fragments.at(1));
					massive_array.push([
						x.canonical_smiles,
						fragments.at(0),
						fragments.at(1),
						x.id,
						x[target.activity_columns[0]]
					]);
					molList.delete();
					m.delete();
					mol_frags.cores.delete();
					mol_frags.sidechains.delete();
				} catch {
					console.error('For Some Reason There are Null Values');
				}
			}
		} catch (e) {
			console.error('Problem: ', e);
		}
		row_list_s[i]['Cores'] = cores_smiles_list;
		row_list_s[i]['R_Groups'] = sidechains_smiles_list;
		mol.delete();
	});

	let countArray = {};

	for (let i = 0; i < massive_array.length; i++) {
		if (massive_array[i].length >= 5) {
			// Ensure there are at least 5 elements in the subarray
			let secondElement = massive_array[i][1];
			let fifthElement = massive_array[i][4]; // Assuming the fifth element is at index 4

			if (!countArray[secondElement]) {
				countArray[secondElement] = [0, []];
			}

			countArray[secondElement][0]++;
			countArray[secondElement][1].push(fifthElement);
		}
	}

	let scaffoldArray = Object.entries(countArray);
	let filteredArrayOfScaffolds = scaffoldArray.filter(
		([key, count]) => typeof count[0] === 'number' && count[0] >= 2 && key.length > 9
	);

	filteredArrayOfScaffolds = filteredArrayOfScaffolds.map((x) => {
		return [x[0], [x[1][0], ksTest(x[1][1], curr_activity_column)]];
	});

	filteredArrayOfScaffolds.sort((a, b) => a[1][1] - b[1][1]);

	return [filteredArrayOfScaffolds, massive_array];
}

function scaffoldFinder(cores) {
	const selectedArrays = scaffCores[1].filter((array) => {
		return array[1] === cores;
	});
	setSpecificMolArray(selectedArrays);
	openModal();
}
