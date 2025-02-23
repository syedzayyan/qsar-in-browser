<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { menuItems } from '$lib/components/utils/dropdown_menu_stuff';
	import { QITB } from '$lib/components/stores/qitb';
	import { get } from 'svelte/store';

	let { children } = $props();
	let isToolsOpen = $state(false);

	onMount(() => {
		let existenceOfQITBFILE = localStorage.getItem('qitb');
		if (existenceOfQITBFILE != null) {
			QITB.set(JSON.parse(existenceOfQITBFILE));
			document.getElementById('alert_of_existence_of_old').showModal();
		} else {
			goto('/tools/dataload');
			console.log('Nothing Is There');
		}
	});

	let filename: string = $state('QITB-Session');

	function saveWork() {
		const combinedJSON = get(QITB);
		const jsonString = JSON.stringify(combinedJSON, null, 2);
		const blob = new Blob([jsonString], { type: 'application/json' });
		const downloadLink = document.createElement('a');
		downloadLink.href = window.URL.createObjectURL(blob);
		downloadLink.download = filename;
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
	}
</script>

<Modal modal_id="alert_of_existence_of_old">
	<h3>Loading Old Cached Files</h3>
</Modal>

<Modal modal_id="save_work">
	<input
		type="text"
		placeholder="Type here"
		bind:value={filename}
		class="input input-bordered w-full max-w-xs"
	/>
    <br /><br />
	<button class="btn" onclick={() => saveWork()}>Save</button>
</Modal>
<div>
	<header class="flex w-full items-center justify-center">
		<ul class="menu menu-horizontal rounded-box bg-base-200">
			<li class="relative">
				<details bind:open={isToolsOpen}>
					<summary class="flex cursor-pointer items-center">
						<span> Tools </span>
					</summary>
					<ul class="menu absolute z-50 w-max min-w-[250px] bg-base-200 p-2">
						{#each menuItems as { title, icon, links }}
							<li>
								<details>
									<summary class="flex items-center gap-2">
										{#if icon}
											<div class="h-4 w-4">
												{@html icon}
											</div>
										{/if}
										{title}
									</summary>
									<ul class="w-full">
										{#each links as link}
											<li>
												<a href={link.href} class="w-full whitespace-nowrap">
													{link.name}
												</a>
											</li>
										{/each}
									</ul>
								</details>
							</li>
						{/each}
					</ul>
				</details>
			</li>
			<li>
				<button
					onclick={() => {
						document.getElementById('save_work').showModal();
					}}
				>
					Save Work 💾
				</button>
			</li>
		</ul>
	</header>
	<main class="container mx-auto flex-grow overflow-hidden px-4 md:px-6 lg:px-8">
		<div class="mx-auto w-full max-w-6xl">
			{@render children()}
		</div>
	</main>
</div>
