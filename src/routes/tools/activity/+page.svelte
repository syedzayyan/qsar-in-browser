<script lang="ts">
	import Histogram from '../../../components/ui/Histogram.svelte';
	import { QITB } from '../../../components/stores/qitb';
	import type { Ligand } from '../../../components/utils/types/ligand';

	let data: Ligand[] = $state([]);
	let act_cols: string[] = $state([]);
	let act_col = $state(act_cols[0]);

	let rendering = $state(false);
	QITB.subscribe((qitb) => {
		data = qitb.ligand_data;
		act_cols = qitb.activity_columns;
		rendering = true;
	});
</script>

<title>Acitivity</title>
<label class="form-control w-full max-w-xs">
	<div class="label">
		<span class="label-text">Pick the activity to display</span>
	</div>
	<select class="select select-bordered" bind:value={act_col}>
		{#each act_cols as activity}
			<option value={activity}>{activity}</option>
		{/each}
	</select>
</label>
{#if rendering}
	<Histogram {data} xLabel={`Activity (${act_col})`} yLabel="Count" {act_col} />
{/if}
