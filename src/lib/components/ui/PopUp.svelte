<script>
	let { children, visible } = $props();
</script>

<!-- Notification -->
<div
	class="fixed bottom-10 right-4 transition-transform duration-500 ease-in-out"
	class:hidden={!visible}
	class:translate-x-full={!visible}
>
	<div class="alert-neutral alert flex w-64 items-center gap-2 shadow-lg">
		<span class="loading loading-spinner text-primary"></span>
		{@render children()}
	</div>
</div>
