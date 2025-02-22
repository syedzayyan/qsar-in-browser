<script lang="ts">
	import { QITB } from '$lib/components/stores/qitb';
	import Histogram from '$lib/components/ui/Histogram.svelte';
	import JSME from '$lib/components/ui/JSME.svelte';
	import type { Ligand } from '$lib/components/utils/types/ligand';
	import { onMount } from 'svelte';
	import { get, writable } from 'svelte/store';

	let open = $state(false);
	let smiles = writable('CCO');
	let refSMILES: string[] = $state([]);
	let taniHistoSelected: string = $state();

	let currQITB: Ligand[] = $state([]);

	onMount(() => {
		QITB.subscribe((qitb) => {
			currQITB = qitb.ligand_data;
		});

		Object.keys(currQITB[0]).map((x) => {
			if (x.includes('tanimoto')) {
				refSMILES.push(x.split('_')[1]);
			}
		});
	});

	function handleTanimotoSubmit() {
		const fp_worker = new Worker(
			new URL('../../../lib/workers/fingerprint_gen.ts', import.meta.url),
			{
				type: 'module'
			}
		);
		const worker = new Worker(new URL('../../../lib/workers/tanimoto.ts', import.meta.url), {
			type: 'module'
		});
		let refSmilesDict = refSMILES.map((item) => ({ canonical_smiles: item }));
		fp_worker.postMessage({ lig: refSmilesDict, fptype: 'MACCS' });

		fp_worker.onmessage = (event) => {
			if (event.data.data != null) {
				worker.postMessage({ data: get(QITB).ligand_data, ref_mols: event.data.data });
			}
		};
		worker.onmessage = (event) => {
			if (event.data.data != null) {
				QITB.update((qitb) => ({ ...qitb, ligand_data: event.data.data }));
				currQITB = event.data.data;
			}
		};
	}
</script>

<title>Tanimoto Similarity Distribution</title>

<select class="select select-bordered" bind:value={taniHistoSelected}>
	{#each refSMILES as smi}
		<option>{smi}</option>
	{/each}
	<option>All</option>
</select>
<br /><br />
<div class="flex items-center gap-2">
	<button
		class="btn"
		onclick={() => {
			refSMILES = [];
		}}>🔄</button
	>
	<input bind:value={$smiles} type="text" placeholder="Type here" class="input input-bordered" />

	<div class="relative">
		<button class="btn" onclick={() => (open = !open)}>▼</button>

		{#if open}
			<div class="fixed rounded-lg shadow-lg">
				<JSME writable_smiles={smiles} />
			</div>
		{/if}
	</div>
	<button
		class="btn"
		onclick={() => {
			refSMILES.push($smiles);
			smiles.set('');
		}}>+</button
	>
	<button
		class="btn"
		onclick={() => {
			handleTanimotoSubmit();
		}}>Generate Tanimoto Graphs</button
	>
</div>

{#if refSMILES.length > 0} <!-- Check if there are selectable options -->
	{#if taniHistoSelected === 'All'}
		{#each refSMILES as smi}
			<Histogram
				xLabel={`Tanimoto Similarity (${smi})`}
				yLabel="Count"
				data={currQITB}
				act_col={`tanimoto_${smi}`}
			/>
		{/each}
	{:else}
		<Histogram
			xLabel="Tanimoto Similarity"
			yLabel="Count"
			data={currQITB}
			act_col={`tanimoto_${taniHistoSelected}`}
		/>
	{/if}
{:else}
	<p>Nothing to display</p>
{/if}
