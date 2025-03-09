export function kFoldSplit(X_data, y_data, k, seed) {
	// Input validation
	if (!Array.isArray(X_data) || !Array.isArray(y_data)) {
		throw new Error('X_data and y_data must be arrays');
	}

	if (X_data.length !== y_data.length) {
		throw new Error('X_data and y_data must have the same length');
	}

	if (X_data.length < k) {
		throw new Error(`Not enough data points for ${k} folds. Need at least ${k} data points.`);
	}

	// Create paired data for shuffling
	const pairedData = X_data.map((x, i) => ({ x, y: y_data[i] }));

	// Shuffle the paired data
	const shuffledData = shuffleArray(pairedData, seed);

	// Calculate fold size
	const foldSize = Math.floor(shuffledData.length / k);
	const remainder = shuffledData.length % k;

	// Initialize result object
	const result = {
		X_folds: Array(k)
			.fill()
			.map(() => []),
		y_folds: Array(k)
			.fill()
			.map(() => [])
	};

	// Distribute data into folds
	let currentIndex = 0;

	for (let i = 0; i < k; i++) {
		// Calculate current fold size (distribute remainder across first few folds)
		const currentFoldSize = foldSize + (i < remainder ? 1 : 0);

		// Get current fold data
		const foldData = shuffledData.slice(currentIndex, currentIndex + currentFoldSize);

		// Separate X and y data
		for (const item of foldData) {
			result.X_folds[i].push(item.x);
			result.y_folds[i].push(item.y);
		}

		currentIndex += currentFoldSize;
	}

	return result;
}

export function createTrainTestSplits(X_folds, y_folds) {
	const k = X_folds.length;
	const result = [];

	for (let i = 0; i < k; i++) {
		const X_test = X_folds[i];
		const y_test = y_folds[i];

		// Create training data by concatenating all other folds
		const X_train = [];
		const y_train = [];

		for (let j = 0; j < k; j++) {
			if (j !== i) {
				X_train.push(...X_folds[j]);
				y_train.push(...y_folds[j]);
			}
		}

		result.push({
			X_train,
			y_train,
			X_test,
			y_test
		});
	}

	return result;
}

function shuffleArray(array, seed) {
	const result = [...array];
	let currentIndex = result.length;
	let randomIndex;

	// Create a seeded random number generator if seed is provided
	const random = seed !== undefined ? createSeededRandom(seed) : () => Math.random();

	// Fisher-Yates shuffle
	while (currentIndex > 0) {
		randomIndex = Math.floor(random() * currentIndex);
		currentIndex--;

		// Swap elements
		[result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
	}

	return result;
}

function createSeededRandom(seed) {
	return function () {
		const x = Math.sin(seed++) * 10000;
		return x - Math.floor(x);
	};
}

export function trainTestSplit(X_data, y_data, trainRatio, seed) {
	// Input validation
	if (!Array.isArray(X_data) || !Array.isArray(y_data)) {
		throw new Error('X_data and y_data must be arrays');
	}

	if (X_data.length !== y_data.length) {
		throw new Error('X_data and y_data must have the same length');
	}

	if (trainRatio <= 0 || trainRatio >= 1) {
		throw new Error('trainRatio must be between 0 and 1');
	}

	// Create paired data for shuffling
	const pairedData = X_data.map((x, i) => ({ x, y: y_data[i] }));

	// Shuffle the paired data
	const shuffledData = shuffleArray(pairedData, seed);

	// Calculate split index
	const trainSize = Math.floor(shuffledData.length * trainRatio);

	// Split the data
	const trainData = shuffledData.slice(0, trainSize);
	const testData = shuffledData.slice(trainSize);

	// Separate X and y data
	const X_train = trainData.map((item) => item.x);
	const y_train = trainData.map((item) => item.y);
	const X_test = testData.map((item) => item.x);
	const y_test = testData.map((item) => item.y);

	return [
		[X_train, y_train],
		[X_test, y_test]
	];
}
