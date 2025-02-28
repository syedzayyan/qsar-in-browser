import '/rdkit/RDKit_minimal.js?url';
console.log('Structure Rendered Worker Activated');

const rdkitScriptUrl = new URL('/rdkit/RDKit_minimal.js', self.location.origin).href;
const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;

self.onmessage = async (event) => {
	// Dynamic import for the RDKit script
	const RDKitModule = await import(/* @vite-ignore */ rdkitScriptUrl);
	initRDKitModule({
		locateFile: (filename) => rdkitWasmUrl
	}).then((RDKitInstance) => {
		self.postMessage({ message: RDKitInstance.version() + ' Loaded' });
		const array_of_mol: string[] = event.data.mol;
		const array_of_svg: string[] = [];
		array_of_mol.map((molecule) => {
			const mol = RDKitInstance.get_mol(molecule);
			array_of_svg.push(mol.get_svg());
		});
		self.postMessage(array_of_svg);
	});
};
