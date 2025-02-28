<script lang="ts">
	import { QITB } from '$lib/components/stores/qitb';
	import { get } from 'svelte/store';
	import Worker from '$lib/workers/mma?worker';
	import RenderWorker from '$lib/workers/mol_render?worker';
	import { onMount } from 'svelte';
	import PopUp from '$lib/components/ui/PopUp.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	let currQITB = get(QITB);
	let act_col = $state();
	const act_cols = currQITB.activity_columns;

	let popUpText = $state('');
	let popUpVisibility = $state(false);

	let scaffoldStuffCollection = $state([]);
	let svgStrings: string[] = $state([]);

	onMount(() => {
		const worker = new Worker();
		const renderWorker = new RenderWorker();

		const currLigand = currQITB.ligand_data.map((data) => ({
			[act_col]: data[act_col],
			canonical_smiles: data['canonical_smiles'],
			id: data['molecule_chembl_id']
		}));

		popUpVisibility = true;
		popUpText = 'Working';

		worker.postMessage(currLigand);
		worker.onmessage = (event) => {
			if (event.data.message != null) {
				popUpText = event.data.message;
			} else if (event.data.data != null) {
				scaffoldStuffCollection = event.data.data;
				const scaffoldCores = scaffoldStuffCollection[0];
				const smilesArray = scaffoldCores.map((item) => item[0]);
				renderWorker.postMessage({ mol: smilesArray });
				renderWorker.onmessage = (event) => {
					if (event.data.message == null) {
						svgStrings = event.data;
						popUpVisibility = false;
					}
				};
			}
		};
	});

	function matchMMA(core_idx: number) {
		document.getElementById('matched-molecules').showModal();
		const selectedArrays = scaffoldStuffCollection[1].filter((array) => {
			return array[1] === scaffoldStuffCollection[0][core_idx][0];
		});
		console.log(selectedArrays);
	}
</script>

<title>MMA</title>

<PopUp visible={popUpVisibility}>
	<span>{popUpText}</span>
</PopUp>

<select class="select select-bordered" bind:value={act_col}>
	{#each act_cols as activity}
		<option value={activity}>{activity}</option>
	{/each}
</select>

<Modal modal_id="matched-molecules">
	<h3>Matched Molecules</h3>
</Modal>

<div class="grid grid-cols-1 gap-12 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
	{#each svgStrings as svgString, i}
		<div class="card w-80 bg-base-100 shadow-xl">
			<figure class="flex justify-center p-4">
				{@html svgString}
			</figure>
			<div class="card-body flex flex-col items-center">
				<div class="card-actions flex w-full justify-center">
					<button onclick={() => matchMMA(i)} class="btn btn-primary w-full md:w-auto"
						>Matched Molecules</button
					>
				</div>
			</div>
		</div>
	{/each}
</div>
