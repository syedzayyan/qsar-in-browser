<script lang="ts">
	import { QITB } from '$lib/components/stores/qitb';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import Worker from '$lib/workers/tsne?worker';
	import ScatterPlot from '$lib/components/ui/ScatterPlot.svelte';
	import PopUp from '$lib/components/ui/PopUp.svelte';

	let tSNEData: [[number, number]] = $state([[0, 0]]);
	let popUpText = $state('');
	let popUpVisibility = $state(false);

	onMount(async () => {
		popUpVisibility = true;
		const currQITB = get(QITB);
		const fingerprints = currQITB.ligand_data.map((x) => x.fingerprint);
		const worker = new Worker();

		worker.postMessage(fingerprints);
		worker.onmessage = (event) => {
			if (event.data.data != null) {
				tSNEData = event.data.data;
				popUpVisibility = false;
			}
			popUpText = event.data.message;
		};
	});
</script>

<title>tSNE</title>
<PopUp visible={popUpVisibility}>{popUpText}</PopUp>
<div style="width: 100%; height: 100%;">
	<ScatterPlot data={tSNEData}></ScatterPlot>
</div>
