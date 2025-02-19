<script>
	import Histogram from '../../../components/ui/Histogram.svelte';
	import { usePersistedState } from '../../../components/stores/qitb';

	let data = [];
	try {
		usePersistedState('qitb').subscribe((x) => (data = x.ligand_data));
	} catch {
        data = [];
    }
</script>

<title>Acitivity</title>
<Histogram {data} />
