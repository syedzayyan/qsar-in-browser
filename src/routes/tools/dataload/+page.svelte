<script>
	let files = $state();
	$effect(() => {
		if (files && files.length > 0) {
			files[0].text().then((data) => console.log(data));
			files = null;
		}
	});

	let targetQuery;
    let searchIsBack = false;
	function searchTargets() {
		fetch(`https://www.ebi.ac.uk/chembl/api/data/target/search?format=json&q=${targetQuery}`).then(
			(data) => {
				console.log(data);
                searchIsBack = true;
			}   
		);
	}
</script>

<title>Load Data Into QITB</title>
<div role="tablist" class="tabs tabs-lifted">
	<input type="radio" name="my_tabs_2" role="tab" class="tab" aria-label="Internet Download" />
	<div role="tabpanel" class="tab-content rounded-box border-base-300 bg-base-100 p-6">
		<form on:submit={() => searchTargets()}>
			<input
				bind:value={targetQuery}
				type="text"
				placeholder="Search for targets"
				class="input input-bordered w-full max-w-xs"
			/>
			{#if searchIsBack}
				<div class="overflow-x-auto">
					<table class="table">
						<!-- head -->
						<thead>
							<tr>
								<th></th>
								<th>Name</th>
								<th>Job</th>
								<th>Favorite Color</th>
							</tr>
						</thead>
						<tbody>
							<!-- row 1 -->
							<tr>
								<th>1</th>
								<td>Cy Ganderton</td>
								<td>Quality Control Specialist</td>
								<td>Blue</td>
							</tr>
							<!-- row 2 -->
							<tr class="hover">
								<th>2</th>
								<td>Hart Hagerty</td>
								<td>Desktop Support Technician</td>
								<td>Purple</td>
							</tr>
							<!-- row 3 -->
							<tr>
								<th>3</th>
								<td>Brice Swyre</td>
								<td>Tax Accountant</td>
								<td>Red</td>
							</tr>
						</tbody>
					</table>
				</div>
			{/if}
		</form>
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
		<input bind:files type="file" class="file-input file-input-bordered w-full max-w-xs" />
	</div>
</div>
