<script lang="ts">
	import Worker from '$lib/workers/mol_render?worker';
	import { onMount } from 'svelte';

	let svgStrings: string[] = $state([]);

	onMount(() => {
		const worker = new Worker();
		worker.postMessage({ mol: ['CCO', 'c2ccc1CCCc1c2'] });
		worker.onmessage = (event) => {
			if (event.data.message != null) {
				console.log(event.data.message);
			} else {
				svgStrings.push(event.data);
			}
			console.log(svgStrings);
		};
	});
</script>

<div>
	{#each svgStrings as svgString}
		{@html svgString}
	{/each}
</div>
