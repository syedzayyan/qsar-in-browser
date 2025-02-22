console.log('Hello');
import '/rdkit/RDKit_minimal.js?url';

self.onmessage = async (event) => {
	initRDKitModule({ locateFile: () => '/rdkit/RDKit_minimal.wasm?url' }).then((RDKitInstance) => {
		self.postMessage(RDKitInstance.version() + ' Loaded');
		const fpType = event.data.fptype;
		const path = event.data.path;
		const nBits = event.data.nbits;
		console.log(nBits, path);
		event.data.lig.map((x) => {
			let mol;

			try {
				mol = RDKitInstance.get_mol(x.canonical_smiles);
				if (fpType === 'MACCS') {
					event.data.lig['fingerprint'] = mol.get_maccs_fp();
				} else if (fpType === 'Morgan') {
					event.data.lig['fingerprint'] = mol.get_morgan_fp(
						JSON.stringify({ radius: path, nBits: nBits })
					);
				} else if (fpType === 'RDK') {
					event.data.lig['fingerprint'] = mol.get_rdkit_fp(
						JSON.stringify({ minPath: path, nBits: nBits })
					);
				} else {
					throw new Error('Error has happened');
				}
				mol.delete();
			} catch (e) {
				console.error(e);
			}

			// mol = rdkit.get_mol(smilesString);
		});
        self.postMessage("Fingerprint Processing Done")
	});
};
