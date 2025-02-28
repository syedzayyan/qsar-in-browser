<script lang="ts">
	import { QITB } from '$lib/components/stores/qitb';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	let tsneModule: any = null;
	let outputData: Float32Array | null = null;

	onMount(async () => {
		try {
			const wasmModule = await import('/tsne/tsne.js?url'); // Load WASM
			const TSNE = await wasmModule.default(); // Initialize WASM module
			tsneModule = TSNE;

			console.log("WASM Loaded:", tsneModule);

			// Get bitvector fingerprints from store
			const currQITB = get(QITB);
			const fp = currQITB.ligand_data.map(x => x.fingerprint); // Array of bitvectors

			// Ensure fp is not empty
			if (!fp.length || !fp[0].length) {
				console.error("Invalid fingerprint data");
				return;
			}

			const N = fp.length;  // Number of samples
			const D = fp[0].length; // Dimensions (bitvector length)

			// Flatten the bitvector array (2D -> 1D)
			const inputData = new Float32Array(N * D);
			for (let i = 0; i < N; i++) {
				inputData.set(fp[i], i * D);
			}

			// Allocate input memory in WASM
			const dataPointer = tsneModule._malloc(inputData.length * inputData.BYTES_PER_ELEMENT);
			tsneModule.HEAPF32.set(inputData, dataPointer / inputData.BYTES_PER_ELEMENT);

			// Allocate output memory in WASM (N * 2D)
			const no_dims = 2;
			const outputPointer = tsneModule._malloc(N * no_dims * 4); // Float32 = 4 bytes

			// Additional t-SNE parameters
			const perplexity = 30.0;
			const theta = 0.5;
			const rand_seed = 42;
			const max_iter = 1000;

			// Run t-SNE
			tsneModule._tsne_run(
				dataPointer, N, D,
				outputPointer, no_dims,
				perplexity, theta,
				rand_seed, max_iter
			);

			// Read the output (2D embeddings) from WASM memory
			outputData = new Float32Array(tsneModule.HEAPF32.buffer, outputPointer, N * no_dims);
			console.log("t-SNE Output Data:", outputData);

			// Free WASM memory
			tsneModule._free(dataPointer);
			tsneModule._free(outputPointer);
		} catch (error) {
			console.error("Failed to load WASM module:", error);
		}
	});
</script>

<h1>t-SNE WASM in Svelte</h1>
{#if outputData}
	<h2>t-SNE Result (First Point): {outputData[0]}, {outputData[1]}</h2>
{/if}
