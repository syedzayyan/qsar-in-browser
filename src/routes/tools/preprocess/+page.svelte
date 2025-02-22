<script lang="ts">
	import { QITB } from '../../../components/stores/qitb';
	import PopUp from '../../../components/ui/PopUp.svelte';
	import mergeActivities from '../../../components/utils/cleanup';
	import type { Ligand } from '../../../components/utils/types/ligand';

	let chemicalFingerprint = $state('MACCS');
	let logStandardValue = $state(true);
    let nbits = $state(2048);
    let radius = $state(2);

    let popUPText = $state("");

	function handleSubmit() {
		const worker = new Worker(new URL('../../../lib/workers/fingerprint_gen.ts', import.meta.url), {type : "module"});
		worker.onmessage = (event) => {popUPText = event.data};
        
		QITB.subscribe((x) => {
			let ligand_data: Ligand[] = x.ligand_data;
			let ligand_data_cleaned: Ligand[] = mergeActivities(ligand_data, logStandardValue);
            worker.postMessage({lig: ligand_data_cleaned, fptype : chemicalFingerprint, nbits : 2048, path : 2});
		});
	}
</script>

<title>Pre - Process Molecules</title>
<PopUp visible={true}>
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

        {#if chemicalFingerprint !== "MACCS"}
            <label class="mb-2 block">Number of Bits</label>
            <input type="number" bind:value={nbits} class="input input-bordered mb-4 w-full" />
            
            <label class="mb-2 block">Radius</label>
            <input type="number" bind:value={radius} class="input input-bordered mb-4 w-full" />
        {/if}

        <label class="flex items-center gap-2">
            <input type="checkbox" bind:checked={logStandardValue} class="checkbox" /> Log Standard Value (e.g., Ki → pKi)
        </label>
        <br />

        <button type="submit" class="btn btn-primary mt-4 w-full">Submit</button>
    </form>
</div>
