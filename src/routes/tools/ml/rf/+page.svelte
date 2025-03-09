<script lang="ts">
	import TrainTestSplit from "$lib/components/ml-forms/TrainTestSplit.svelte";
    
</script>

<title>Random Forest</title>

<div role="tablist" class="tabs tabs-lifted">
	<input checked = {true} type="radio" name="my_tabs_2" role="tab" class="tab" aria-label="Train Test Split" />
	<div role="tabpanel" class="tab-content rounded-box border-base-300 bg-base-100 p-6">
        <TrainTestSplit />
    </div>

	<input
		type="radio"
		name="my_tabs_2"
		role="tab"
		class="tab"
		aria-label="Grid Search CV"
	/>
	<div role="tabpanel" class="tab-content rounded-box border-base-300 bg-base-100 p-6"></div>
</div>
