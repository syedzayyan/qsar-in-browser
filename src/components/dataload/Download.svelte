<script lang="ts">
	import Modal from '../ui/Modal.svelte';
	import getFullActivityData from '../utils/chemblLigandDownloader.ts';
	import { writable } from 'svelte/store';
	import { persistedState } from '../stores/qitb';
	import { goto } from '$app/navigation';

	let targetQuery: string = $state('CHEMBL226');
	let searchIsBack = $state(false);
	let targetQueryResults = $state([]);
	let target_chembl_id: string;

	let unit_type: string = $state('Ki');
	let assay_type: string = $state('B');
	let species: boolean = $state(true);

	let progress = writable(0);

	function searchTargets() {
		fetch(`https://www.ebi.ac.uk/chembl/api/data/target/search?format=json&q=${targetQuery}`)
			.then((data) => data.json())
			.then((data) => {
				targetQueryResults = data.targets;
				console.log(targetQueryResults);
				searchIsBack = true;
			});
	}
	function downloadTargetLigands() {
		getFullActivityData(target_chembl_id, unit_type, assay_type, progress, species)
			.then((data) => {
				persistedState('qitb', {
					data_source: 'chembl',
					activity_columns: [unit_type],
					species: species ? 'Homo Sapiens' : 'Other',
					ligand_data: data
				});
			})
			.then(() => goto('/tools/preprocess/'));
	}
</script>

<Modal modal_id="ligand-download">
	<h3 class="text-lg font-bold">Fetch Ligands For The Target</h3>
	<br />
	<form>
		<div class="join">
			<select bind:value={unit_type} class="join-item select select-bordered">
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
			<select bind:value={assay_type} class="join-item select select-bordered">
				<option disabled selected>Assay Type</option>
				<option value="B">Binding</option>
				<option value="F">Functional</option>
				<option value="ADMET">ADMET</option>
				<option value="T">Toxicity</option>
				<option value="P">Physiochemical</option>
				<option value="U">Unclassified</option>
			</select>
		</div>
		<br /><br />
		<input bind:value={species} type="radio" name="radio-1" class="radio" checked="checked" />
		<input bind:value={species} type="radio" name="radio-1" class="radio" />
		<br /><br />
		<button
			on:click={() => {
				downloadTargetLigands();
			}}
			class="btn">Fetch</button
		>
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
<form on:submit={() => searchTargets()}>
	<input
		bind:value={targetQuery}
		type="text"
		placeholder="Search for targets"
		class="input input-bordered w-full max-w-xs"
	/>

	<!-- Open the modal using ID.showModal() method -->
	{#if searchIsBack}
		<div class="overflow-x-auto">
			<table class="table">
				<!-- head -->
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
							on:click={() => {
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
