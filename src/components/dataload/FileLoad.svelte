<script>
	let files = $state();
	$effect(() => {
		if (files && files.length > 0) {
			files[0].text().then((data) => console.log(data));
			files = null;
		}
	});
</script>

<input bind:files type="file" class="file-input file-input-bordered w-full max-w-xs" />
