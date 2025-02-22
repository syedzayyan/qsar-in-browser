console.log('Tanimoto Similarity Functions Activated');
import * as math from 'mathjs';

//https://pubs.acs.org/doi/full/10.1021/ci0504723?casa_token=L3jj_AhYOLsAAAAA%3A4dsWnQISR-4v4J3Zk5mJBBo6xovPx45hETrhxy9ar_TVpd2bmCOrIu08qvb0def0naKeTMkwTxyXi_I0ug

export default function TanimotoSimilarity(v1: number[], v2: number[]): number {
	const numer: number = math.dot(v1, v2);
	if (numer === 0.0) {
		return 0.0;
	}
	const denom: number =
		math.number(math.square(math.norm(v1, 2))) + math.number(math.square(math.norm(v2, 2))) - numer;
	if (denom == 0.0) {
		return 0.0;
	}
	return numer / denom;
}

self.onmessage = async (event) => {
	const ligand = event.data.data;
	const reference = event.data.ref_mols;
	reference.map((refs) => {
		ligand.map((lig) => {
			try {
				lig[`tanimoto_${refs.canonical_smiles}`] = TanimotoSimilarity(refs.fingerprint, lig.fingerprint);
			} catch (e) {
				console.log(e);
			}
		});
	});
	self.postMessage({data : ligand});
};
