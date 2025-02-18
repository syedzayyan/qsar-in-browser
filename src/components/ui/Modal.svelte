<script>
    let {modal_id} = $props()
</script>
<dialog id={modal_id} class="modal">
	<div class="modal-box">
        <slot />
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Close</button>
			</form>
		</div>
	</div>
</dialog>
