<script lang="ts">
	import { get } from 'svelte/store';
	import { QITB } from '$lib/components/stores/qitb';
	import PopUp from '$lib/components/ui/PopUp.svelte';
	import mergeActivities from '$lib/components/utils/cleanup';
	import type { Ligand } from '$lib/components/utils/types/ligand';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Worker from '$lib/workers/fingerprint_gen?worker';

	let chemicalFingerprint = $state('MACCS');
	let logStandardValue = $state(true);
	let nbits = $state(2048);
	let radius = $state(2);

	let popUPText = $state('');
	let popUpVisibility = $state(false);

	function handleSubmit() {
		try {
			popUpVisibility = true;
			const worker = new Worker();
			let currQITB = get(QITB);

			if (currQITB.logged_once) {
				logStandardValue = false;
				document.getElementById('log10').showModal();
			}

			let ligand_data: Ligand[] = currQITB.ligand_data;
			let ligand_data_cleaned: Ligand[] = mergeActivities(ligand_data, logStandardValue);

			worker.postMessage({
				lig: ligand_data_cleaned,
				fptype: chemicalFingerprint,
				nbits: nbits,
				path: radius
			});

			worker.onmessage = (event) => {
				if (event.data.data != null) {
					QITB.update((existing) => ({
						...existing,
						ligand_data: event.data.data,
						logged_once: true,
						activity_columns: logStandardValue
							? currQITB.activity_columns.map((x) => `p${x}`)
							: currQITB.activity_columns,
						fingerprint: {
							type: chemicalFingerprint,
							nbits: nbits,
							path: radius
						}
					}));
					return;
				} else {
					popUPText = event.data;
				}
			};
		} catch (e) {
			popUPText = 'Error Happened' + e;
			console.error(e);
		}
	}
</script>

<title>Pre - Process Molecules</title>
<Modal modal_id="log10">
	<span
		>You have already converted the Activity Values to logarithm once, thus skipping this time</span
	>
</Modal>
<PopUp visible={popUpVisibility}>
	<span>{popUPText}</span>
</PopUp>
<br />

<div class="mx-auto max-w-md rounded-xl p-6 shadow-xl">
	<h2 class="mb-4 text-xl font-semibold">Pre-process the data</h2>
	<form onsubmit={handleSubmit}>
		<label class="mb-2 block">Type of Chemical Fingerprint</label>
		<select bind:value={chemicalFingerprint} class="select select-bordered mb-4 w-full">
			<option value="MACCS">MACCS</option>
			<option value="Morgan">Morgan</option>
			<option value="RDK">RDK</option>
		</select>

		{#if chemicalFingerprint !== 'MACCS'}
			<label class="mb-2 block">Number of Bits</label>
			<input type="number" bind:value={nbits} class="input input-bordered mb-4 w-full" />

			<label class="mb-2 block">Radius</label>
			<input type="number" bind:value={radius} class="input input-bordered mb-4 w-full" />
		{/if}

		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={logStandardValue} class="checkbox" /> Log Standard Value (e.g.,
			Ki → pKi)
		</label>
		<br />

		<button type="submit" class="btn btn-primary mt-4 w-full">Submit</button>
	</form>
</div>
