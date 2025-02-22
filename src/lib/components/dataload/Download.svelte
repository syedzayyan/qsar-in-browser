<script lang="ts">
	import Modal from '../ui/Modal.svelte';
	import getFullActivityData from '../utils/chemblLigandDownloader';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import type { Ligand } from '../utils/types/ligand';
    import { QITB } from "../stores/qitb";
	import type { Target } from '../utils/types/target';

	let targetQuery: string = $state('CHEMBL226');
	let searchIsBack = $state(false);
	let targetQueryResults: Target[] = $state([]);
	let target_chembl_id: string;

	let unitAssayPairs = writable([{ unit_type: 'Ki', assay_type: 'B' }]);
	let species: boolean = $state(true);
	let progress = writable(0);

	function addUnitAssayPair() {
		unitAssayPairs.update((pairs) => [...pairs, { unit_type: '', assay_type: '' }]);
	}

	function removeUnitAssayPair(index: number) {
		unitAssayPairs.update((pairs) =>
			pairs.length > 1 ? pairs.filter((_, i) => i !== index) : pairs
		);
	}

	function searchTargets() {
		fetch(`https://www.ebi.ac.uk/chembl/api/data/target/search?format=json&q=${targetQuery}`)
			.then((data) => data.json())
			.then((data) => {
				targetQueryResults = data.targets;
				searchIsBack = true;
			});
	}

	async function downloadTargetLigands() {
		let combinedData: Ligand[] = [];
		const pairs = $unitAssayPairs;

		for (const pair of pairs) {
			const data = await getFullActivityData(
				target_chembl_id,
				pair.unit_type,
				pair.assay_type,
				progress,
				species
			);
			combinedData = [...combinedData, ...data];
		}
		QITB.set({
			data_source: 'chembl',
			activity_columns: pairs.map((p) => p.unit_type),
			species: species ? 'Homo Sapiens' : 'Other',
			ligand_data: combinedData,
            logged_once: false
		});

		goto('/tools/preprocess/');
	}
</script>

<Modal modal_id="ligand-download">
	<h3 class="text-lg font-bold">Fetch Ligands For The Target</h3>
	<br />
	<form>
		{#each $unitAssayPairs as pair, index}
			<div class="join">
				<select bind:value={pair.unit_type} class="join-item select select-bordered">
					<option disabled selected>Unit Type</option>
					<option value="Ki">Ki</option>
					<option value="EC50">EC50</option>
					<option value="IC50">IC50</option>
					<option value="AC50">AC50</option>
					<option value="XC50">XC50</option>
					<option value="Kd">Kd</option>
					<option value="ED50">ED50</option>
					<option value="Potency">Potency</option>
				</select>
				<select bind:value={pair.assay_type} class="join-item select select-bordered">
					<option disabled selected>Assay Type</option>
					<option value="B">Binding</option>
					<option value="F">Functional</option>
					<option value="ADMET">ADMET</option>
					<option value="T">Toxicity</option>
					<option value="P">Physiochemical</option>
					<option value="U">Unclassified</option>
				</select>
				&nbsp;
				<button type="button" onclick={() => removeUnitAssayPair(index)} class="btn btn-error"
					>-</button
				>
			</div>
			<br /><br />
		{/each}
		<br />
		<button type="button" onclick={addUnitAssayPair} class="btn btn-secondary">+</button>
		<br /><br />
		<input bind:value={species} type="radio" name="radio-1" class="radio" checked={true} />
		<input bind:value={species} type="radio" name="radio-1" class="radio" />
		<br /><br />
		<button onclick={downloadTargetLigands} class="btn">Fetch</button>
	</form>
	{#if $progress != 0}
		<div
			class="radial-progress"
			style="--value:{$progress}; --size:12rem; --thickness: 2px;"
			role="progressbar"
		>
			{Math.round($progress)}%
		</div>
	{/if}
</Modal>

<form onsubmit={searchTargets}>
	<input
		bind:value={targetQuery}
		type="text"
		placeholder="Search for targets"
		class="input input-bordered w-full max-w-xs"
	/>
	{#if searchIsBack}
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>ChEMBL ID</th>
						<th>Target Name</th>
						<th>Organism</th>
					</tr>
				</thead>
				<tbody>
					{#each targetQueryResults as result}
						<tr
							onclick={() => {
								document.getElementById('ligand-download').showModal();
								target_chembl_id = result.target_chembl_id;
							}}
						>
							<td>{result.target_chembl_id}</td>
							<td>{result.pref_name}</td>
							<td>{result.organism}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</form>
