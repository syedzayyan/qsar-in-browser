<script>
	import { onMount } from 'svelte';
	import generateRandomKey from '../utils/randomkey';

	let { height = '400px', width = '600px', jsme_id = generateRandomKey(16), writable_smiles = null } = $props();

	function jsmeOnLoad() {
		let jsmeApplet = null;
		const divElement = document.getElementById(jsme_id);
		if (divElement) {
			divElement.innerHTML = ''; // Clear the contents of the div
		}
		jsmeApplet = new JSApplet.JSME(jsme_id, width, height, {
			options: 'newlook',
			guicolor: '#708090'
		});
		jsmeApplet.setCallBack('AfterStructureModified', handleChange);
	}
    
    function handleChange(e){
        console.log(e.src.smiles());
        if (writable_smiles != null) {
            writable_smiles.set(e.src.smiles());
        }
    }

	onMount(async () => {
		await loadJSME();
		globalThis.jsmeOnLoad = jsmeOnLoad;
		jsmeOnLoad(); // Ensure it gets called after loading
	});

	async function loadJSME() {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = '/jsme/jsme.nocache.js'; // Ensure this path is correct
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load JSME'));
			document.head.appendChild(script);
		});
	}
</script>

<div id={jsme_id}></div>
