<script lang="ts">
	import { QITB } from '$lib/components/stores/qitb';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import Worker from '$lib/workers/tsne?worker';
	import ScatterPlot from '$lib/components/ui/ScatterPlot.svelte';

    let tSNEData: [[number, number]] = $state([[0,0]])
    onMount(async () => {
        const currQITB = get(QITB);
        const fingerprints = currQITB.ligand_data.map((x) => x.fingerprint);
        const worker = new Worker();
        
        worker.postMessage(fingerprints);
        worker.onmessage = (event) => {
            tSNEData = event.data.data;
        };
    });
</script>

<title>tSNE</title>
<div style="width: 100%; height: 100%;">
	<ScatterPlot data={tSNEData}></ScatterPlot>
</div>
