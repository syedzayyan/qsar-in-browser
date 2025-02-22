<script>
    let {modal_id, children} = $props()
</script>
<dialog id={modal_id} class="modal">
	<div class="modal-box">
        {@render children()}
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Close</button>
			</form>
		</div>
	</div>
</dialog>
