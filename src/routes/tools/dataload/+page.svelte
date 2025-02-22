<script>
	import FileLoad from '$lib/components/dataload/FileLoad.svelte';
	import Download from '$lib/components/dataload/Download.svelte';
</script>

<title>Load Data Into QITB</title>
<div role="tablist" class="tabs tabs-lifted">
	<input type="radio" name="my_tabs_2" role="tab" class="tab" aria-label="Internet Download" />
	<div role="tabpanel" class="tab-content rounded-box border-base-300 bg-base-100 p-6">
		<Download />
	</div>

	<input
		type="radio"
		name="my_tabs_2"
		role="tab"
		class="tab"
		aria-label="Local Files"
		checked="checked"
	/>
	<div role="tabpanel" class="tab-content rounded-box border-base-300 bg-base-100 p-6">
		<FileLoad />
	</div>
</div>
