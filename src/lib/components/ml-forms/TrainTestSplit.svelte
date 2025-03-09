<script lang="ts">
	import { get } from 'svelte/store';
	import type { RFHyperParams } from '../utils/types/model_hyperparams';
	import { QITB } from '../stores/qitb';
	import Worker from '$lib/workers/rf?worker';
	import PopUp from '../ui/PopUp.svelte';

	const hyperParams: RFHyperParams = $state({
		nEstimators: 500,
		maxDepth: 10,
		minInfoGain: 0.001,
		minSamplesLeaf: 5
	});

	let metrics = $state();
	let metric_vis = $state(false);

    let popUpText = $state("Loading Worker");

	let trainTestSplit = $state(80);
	function runRF() {
		const worker = new Worker();
		const currQITB = get(QITB);

		worker.postMessage({
			hyperparameters: JSON.parse(JSON.stringify(hyperParams)),
			data: currQITB.ligand_data,
			activity: 'pKi',
			train_test_split: trainTestSplit,
			type: 0
		});

		worker.onmessage = (event) => {
            if (event.data.message != null) {
                popUpText = event.data.message;
            }
			if (event.data.metrics != null) {
				metrics = event.data.metrics;
				metric_vis = true;
			}
		};
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-2">
		<div class="flex justify-between">
			<label for="train-split">Train/Test Split: {trainTestSplit}% / {100 - trainTestSplit}%</label>
		</div>
		<input
			id="train-split"
			type="range"
			min="50"
			max="95"
			bind:value={trainTestSplit}
			class="range range-primary"
			step="5"
		/>
	</div>

	<div class="flex max-w-md flex-col gap-2 rounded-lg border-2 border-blue-200 p-4">
		<h3 class="mb-3 border-b-2 border-indigo-300 pb-1 text-lg font-semibold">Hyperparameters:</h3>
		<div class="flex flex-col gap-2">
			<div class="flex justify-between">
				<label for="n-estimators">Number of Estimators: {hyperParams.nEstimators}</label>
			</div>
			<input
				id="n-estimators"
				type="range"
				min="10"
				max="1000"
				bind:value={hyperParams.nEstimators}
				class="range"
				step="10"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<div class="flex justify-between">
				<label for="max-depth">Max Depth: {hyperParams.maxDepth}</label>
			</div>
			<input
				id="max-depth"
				type="range"
				min="1"
				max="30"
				bind:value={hyperParams.maxDepth}
				class="range range-accent"
				step="1"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<div class="flex justify-between">
				<label for="min-info-gain">Min Information Gain: {hyperParams.minInfoGain.toFixed(4)}</label
				>
			</div>
			<input
				id="min-info-gain"
				type="range"
				min="0.0001"
				max="0.01"
				bind:value={hyperParams.minInfoGain}
				class="range range-success"
				step="0.0001"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<div class="flex justify-between">
				<label for="min-samples-leaf">Min Samples per Leaf: {hyperParams.minSamplesLeaf}</label>
			</div>
			<input
				id="min-samples-leaf"
				type="range"
				min="1"
				max="20"
				bind:value={hyperParams.minSamplesLeaf}
				class="range range-warning"
				step="1"
			/>
		</div>
	</div>
</div>
<br />
<button onclick={() => runRF()} class="btn btn-primary">Run Random Forest Model</button>
<PopUp visible = {true}>{popUpText}</PopUp>
{#if metric_vis}
	<div>{metrics.mae} || {metrics.mse} || {metrics.r2}</div>
{/if}
