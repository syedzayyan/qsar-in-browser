import { ksTest } from "$lib/components/utils/ksTest";

console.log('MMA Worker Activated');

function scaffoldArrayGetter(row_list_s, RDKit) {
	const activity: string = Object.keys(row_list_s[0])[0]; // Get the second key of the first object
    const curr_activity_column = row_list_s.map((obj: string) => obj[activity]);

	const massive_array = [];
	row_list_s.map((x, i) => {
		try {
			const mol = RDKit.get_mol(x.canonical_smiles);
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
						massive_array.push([
							x.canonical_smiles,
							fragments.at(0),
							fragments.at(1),
							x.id,
							activity
						]);
						// 
						// 

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
	const countArray = {};

    console.log("Ranking Now")

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
	const scaffoldArray = Object.entries(countArray);
	let filteredArrayOfScaffolds = scaffoldArray.filter(
		([key, count]) => typeof count[0] === 'number' && count[0] >= 2 && key.length > 9
	);

	filteredArrayOfScaffolds = filteredArrayOfScaffolds.map((x) => {
		return [x[0], [x[1][0], ksTest(x[1][1], curr_activity_column)]];
	});
	return [filteredArrayOfScaffolds, massive_array];
}

const rdkitScriptUrl = new URL('/rdkit/RDKit_minimal.js', self.location.origin).href;
const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;

self.onmessage = async (event) => {
	// Dynamic import for the RDKit script
	const RDKitModule = await import(/* @vite-ignore */ rdkitScriptUrl);

	initRDKitModule({
		locateFile: (filename) => rdkitWasmUrl
	}).then((RDKitInstance) => {
		self.postMessage({ message: RDKitInstance.version() + 'Loaded' });
		self.postMessage({ message: "Churning Out Scaffolds" });
		const scaffoldResult = scaffoldArrayGetter(event.data, RDKitInstance);
		self.postMessage({ message: "Done...." });
		self.postMessage({ data: scaffoldResult });
	});
};
