import { calculateMAE, calculateMSE, calculateR2 } from '$lib/components/utils/ml_metrics';
import { trainTestSplit } from '$lib/components/utils/splitters';
import type { Ligand } from '$lib/components/utils/types/ligand';

const rfURL = new URL('/rf/random_forest.js', self.location.origin).href;
self.onmessage = async (event) => {
	const Module = await import(/* @vite-ignore */ rfURL);
	const RandomForestModule = await Module.default({
		print: (text) => self.postMessage({ message: text })
	});
	const data: Ligand[] = event.data.data;

	const X_id_data = data.map((x) => x.molecule_chembl_id);
	const y_data = data.map((x) => x[event.data.activity]);

	const [[X_train_ids, y_train], [X_test_ids, y_test]] = trainTestSplit(
		X_id_data,
		y_data,
		event.data.train_test_split / 100,
		42
	);

	const id_to_smiles = {};
	data.forEach((x) => {
		id_to_smiles[x.molecule_chembl_id] = x.canonical_smiles;
	});

	// Map the training and test IDs to their corresponding SMILES
	const X_train = X_train_ids.map((id) => id_to_smiles[id]);
	const X_test = X_test_ids.map((id) => id_to_smiles[id]);

	if (event.data.type == 0) {
		const nFeatures = X_train[0].length;
		const hypar = event.data.hyperparameters;
		const forest = RandomForestModule.create(
			hypar.nEstimators,
			hypar.maxDepth,
			hypar.minSamplesLeaf,
			hypar.minInfoGain
		);
		const isRegression = true;
		RandomForestModule.train(forest, X_train, y_train, nFeatures, 1, isRegression, nFeatures);
		console.log('Model training completed');

		const prediction = RandomForestModule.predictMultiple(forest, X_test, X_test.length, nFeatures);

		self.postMessage({
			metrics: {
				mae: calculateMAE(prediction, y_test),
				mse: calculateMSE(prediction, y_test),
				r2: calculateR2(prediction, y_test)
			},
			split_typing: [
				[X_train_ids, y_train],
				[X_test_ids, y_test]
			]
		});

		RandomForestModule.destroy(forest);
	}
};
