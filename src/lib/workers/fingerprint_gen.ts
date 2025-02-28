import '/rdkit/RDKit_minimal.js?url';
import bitStringToBitVector from '$lib/components/utils/bit_vect';

console.log('Fingerprint Worker Activated');

const rdkitScriptUrl = new URL('/rdkit/RDKit_minimal.js', self.location.origin).href;
const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;

self.onmessage = async (event) => {
	// Dynamic import for the RDKit script
	const RDKitModule = await import(/* @vite-ignore */ rdkitScriptUrl);
	initRDKitModule({
		locateFile: (filename) => rdkitWasmUrl
	}).then((RDKitInstance) => {
		self.postMessage(RDKitInstance.version() + ' Loaded');
		const fpType = event.data.fptype;
		const path = event.data.path;
		const nBits = event.data.nbits;
		const ligand_data = event.data.lig;
		const ligand_data_len = ligand_data.length;
        const new_clean_ligand_data = [];

		ligand_data.map((x, idx) => {
			let mol;
			try {
				mol = RDKitInstance.get_mol(x.canonical_smiles);
				if (fpType === 'MACCS') {
					x['fingerprint'] = bitStringToBitVector(mol.get_maccs_fp());
				} else if (fpType === 'Morgan') {
					x['fingerprint'] = bitStringToBitVector(
						mol.get_morgan_fp(JSON.stringify({ radius: path, nBits: nBits }))
					);
				} else if (fpType === 'RDK') {
					x['fingerprint'] = bitStringToBitVector(
						mol.get_rdkit_fp(JSON.stringify({ minPath: path, nBits: nBits }))
					);
				} else {
					throw new Error('Error has happened');
				}
				mol.delete();
                new_clean_ligand_data.push(x);
				self.postMessage(`Progress: ${Math.round((idx / ligand_data_len) * 100)}%`);
			} catch (e) {
				console.error(e);
			}
		});
		self.postMessage({ data: new_clean_ligand_data });
		self.postMessage('Fingerprint Processing Done');
	});
};
