<script lang="ts">
    export const prerender = true;
	let { children } = $props();
	import { menuItems } from '../../components/utils/dropdown_menu_stuff.ts';
	
	let isToolsOpen = false;
</script>
<div>
	<header class="flex w-full items-center justify-center">
		<ul class="menu rounded-box bg-base-200 menu-horizontal">
			<li class="relative">
				<details bind:open={isToolsOpen}>
					<summary class="flex cursor-pointer items-center">
						<a> Tools </a>
					</summary>
					<ul class="menu bg-base-200 p-2 absolute min-w-[250px] w-max z-50">
						{#each menuItems as { title, icon, links }}
							<li>
								<details>
									<summary class="flex items-center gap-2">
										{#if icon}
											<div class="w-4 h-4">
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
				<a>Something</a>
			</li>
			<li>
				<a>
					Stats
					<span class="badge badge-info badge-xs"></span>
				</a>
			</li>
		</ul>
	</header>
	<main class="flex-grow overflow-hidden mx-auto container px-4 md:px-6 lg:px-8">
		<div class="max-w-6xl mx-auto w-full">
			{@render children()}
		</div>
	</main>
</div>
