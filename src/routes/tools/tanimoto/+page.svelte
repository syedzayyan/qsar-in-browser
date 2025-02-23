<script lang="ts">
	import { QITB } from '$lib/components/stores/qitb';
	import Histogram from '$lib/components/ui/Histogram.svelte';
	import JSME from '$lib/components/ui/JSME.svelte';
	import PopUp from '$lib/components/ui/PopUp.svelte';
	import type { Ligand } from '$lib/components/utils/types/ligand';
	import { onMount } from 'svelte';
	import { get, writable } from 'svelte/store';
	import FPWorker from '$lib/workers/fingerprint_gen?worker';
	import Worker from '$lib/workers/tanimoto?worker';

	let open = $state(false);
	let smiles = writable('CCO');
	let refSMILES: string[] = $state([]);
	let taniHistoSelected: string = $state('');

	let popUpText = $state('');
	let popUpVisibility = $state(false);

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
		let currQITBThings = get(QITB);
		popUpVisibility = true;
		popUpText = 'Starting Work';
		try {
			const fp_worker = new FPWorker();
			const worker = new Worker();


			let refSmilesDict = refSMILES.map((item) => ({ canonical_smiles: item }));
			fp_worker.postMessage({
				lig: refSmilesDict,
				fptype: currQITBThings.fingerprint?.type,
				path: currQITBThings.fingerprint?.path,
				nbits: currQITBThings.fingerprint?.nbits
			});

			fp_worker.onmessage = (event) => {
				if (event.data.data != null) {
					worker.postMessage({ data: currQITBThings.ligand_data, ref_mols: event.data.data });
				}
				popUpText = event.data.message;
			};
			worker.onmessage = (event) => {
				if (event.data.data != null) {
					QITB.update((qitb) => ({ ...qitb, ligand_data: event.data.data }));
					currQITB = event.data.data;
				}
				popUpText = event.data.message;
				setTimeout(() => {
					popUpVisibility = false;
				}, 1000);
			};
		} catch (e) {
			popUpText = 'Error Happened' + e;
			console.error(e);
		}
	}
</script>

<title>Tanimoto Similarity Distribution</title>
<PopUp visible={popUpVisibility}>{popUpText}</PopUp>
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
			if ($smiles != '') {
				refSMILES.push($smiles);
				smiles.set('');
			}
		}}>+</button
	>
	<button
		class="btn"
		onclick={() => {
			handleTanimotoSubmit();
		}}>Generate Tanimoto Graphs</button
	>
</div>

{#if refSMILES.length > 0}
	<!-- Check if there are selectable options -->
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
