const tsneURL = new URL('/tsne/tsne_wasm.js', self.location.origin).href;

self.onmessage = async (event) => {
	// Dynamic import for the RDKit script
	const Module = await import(/* @vite-ignore */ tsneURL);
	const module = await Module.default({
		print: (text) => self.postMessage({ message: text }),
	});
    const fingerprints = event.data;
	const tsneResult = await module.tSNEJS(
		fingerprints,
		2, // Default: 2D visualization
		0.5, // Perplexity
		0.5, // Barnes-Hut approximation
		750 // Reasonable iteration limit
	);
    self.postMessage({ data : tsneResult});
};
