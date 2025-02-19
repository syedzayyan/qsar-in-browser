<script>
	import { usePersistedState } from '../../../components/stores/qitb';
	try {
		let data = usePersistedState('qitb');
		data.subscribe((x) => {
			// x.ligand_data.map((y) => {
			//	console.log(-1 * Math.log10(y.standard_value * 10e-9));
			// });
		});
	} catch {}
	let chemicalFingerprint = 'MACCS';
	let logStandardValue = true;
	let removeDuplicates = true;

	function handleSubmit() {
		console.log({ chemicalFingerprint, logStandardValue, removeDuplicates });
	}
</script>

<title>Pre - Process Molecules</title>
<br />
<div class="mx-auto max-w-md rounded-xl p-6 shadow-xl">
	<h2 class="mb-4 text-xl font-semibold">Pre-process the data</h2>
	<form on:submit|preventDefault={handleSubmit}>
		<label class="mb-2 block">Type of Chemical Fingerprint</label>
		<select bind:value={chemicalFingerprint} class="select select-bordered mb-4 w-full">
			<option value="MACCS">MACCS</option>
			<option value="Morgan">Morgan</option>
			<option value="RDK">RDK</option>
		</select>

		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={logStandardValue} class="checkbox" /> Log Standard Value (e.g.,
			Ki → pKi)
		</label>
		<br />
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={removeDuplicates} class="checkbox" /> Remove Duplicates
		</label>

		<button type="submit" class="btn btn-primary mt-4 w-full">Submit</button>
	</form>
</div>
