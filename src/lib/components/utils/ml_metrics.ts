/**
 * Calculate Mean Absolute Error (MAE)
 * @param {Array<number>} predictions Array of predicted values
 * @param {Array<number>} actual Array of actual values
 * @returns {number} Mean Absolute Error
 */
export function calculateMAE(predictions: number[], actual: number[]): number {
	if (predictions.length !== actual.length) {
		throw new Error('Prediction and actual arrays must have the same length');
	}
	let sum = 0;
	for (let i = 0; i < predictions.length; i++) {
		sum += Math.abs(predictions[i] - actual[i]);
	}
	return sum / predictions.length;
}

/**
 * Calculate Mean Squared Error (MSE)
 * @param {Array<number>} predictions Array of predicted values
 * @param {Array<number>} actual Array of actual values
 * @returns {number} Mean Squared Error
 */
export function calculateMSE(predictions: number[], actual: number[]): number {
	if (predictions.length !== actual.length) {
		throw new Error('Prediction and actual arrays must have the same length');
	}
	let sum = 0;
	for (let i = 0; i < predictions.length; i++) {
		sum += Math.pow(predictions[i] - actual[i], 2);
	}
	return sum / predictions.length;
}

/**
 * Calculate R-squared (Coefficient of Determination)
 * @param {Array<number>} predictions Array of predicted values
 * @param {Array<number>} actual Array of actual values
 * @returns {number} R-squared value
 */
export function calculateR2(predictions: number[], actual: number[]): number {
	if (predictions.length !== actual.length) {
		throw new Error('Prediction and actual arrays must have the same length');
	}
	
	// Calculate mean of actual values
	const mean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
	
	// Calculate total sum of squares (proportional to variance of actual values)
	let totalSumSquares = 0;
	for (let i = 0; i < actual.length; i++) {
		totalSumSquares += Math.pow(actual[i] - mean, 2);
	}
	
	// Calculate residual sum of squares
	let residualSumSquares = 0;
	for (let i = 0; i < actual.length; i++) {
		residualSumSquares += Math.pow(actual[i] - predictions[i], 2);
	}
	
	// Calculate R-squared
	return 1 - (residualSumSquares / totalSumSquares);
}

/**
 * Calculate classification accuracy
 * @param {Array<number | boolean>} predictions Array of predicted classes (1/0 or true/false)
 * @param {Array<number | boolean>} actual Array of actual classes (1/0 or true/false)
 * @returns {number} Accuracy (proportion of correct predictions)
 */
export function calculateAccuracy(predictions: (number | boolean)[], actual: (number | boolean)[]): number {
	if (predictions.length !== actual.length) {
		throw new Error('Prediction and actual arrays must have the same length');
	}
	
	let correctCount = 0;
	for (let i = 0; i < predictions.length; i++) {
		if (predictions[i] === actual[i]) {
			correctCount++;
		}
	}
	
	return correctCount / predictions.length;
}

/**
 * Calculate Area Under the ROC Curve (AUC-ROC)
 * @param {Array<number>} probabilities Array of predicted probabilities for the positive class
 * @param {Array<number | boolean>} actual Array of actual classes (1/0 or true/false)
 * @returns {number} AUC-ROC score
 */
export function calculateAUCROC(probabilities: number[], actual: (number | boolean)[]): number {
	if (probabilities.length !== actual.length) {
		throw new Error('Probability and actual arrays must have the same length');
	}
	
	// Pair probabilities with actual values and sort by probability in descending order
	const pairs: Array<{prob: number, actual: number}> = [];
	for (let i = 0; i < probabilities.length; i++) {
		pairs.push({ prob: probabilities[i], actual: actual[i] ? 1 : 0 });
	}
	pairs.sort((a, b) => b.prob - a.prob);
	
	// Count positive and negative examples
	const numPositive = actual.filter(val => val === 1 || val === true).length;
	const numNegative = actual.length - numPositive;
	
	if (numPositive === 0 || numNegative === 0) {
		throw new Error('AUC-ROC requires at least one positive and one negative example');
	}
	
	// Calculate AUC using the trapezoidal rule
	let truePositiveCount = 0;
	let falsePositiveCount = 0;
	let auc = 0;
	let prevFPR = 0;
	let prevTPR = 0;
	
	// Add a point for (0,0)
	for (const pair of pairs) {
		if (pair.actual === 1) {
			truePositiveCount++;
		} else {
			falsePositiveCount++;
		}
		
		const tpr = truePositiveCount / numPositive;
		const fpr = falsePositiveCount / numNegative;
		
		// Calculate area of the trapezoid
		auc += (fpr - prevFPR) * (tpr + prevTPR) / 2;
		
		prevFPR = fpr;
		prevTPR = tpr;
	}
	
	return auc;
}

// Example usage:
/*
const predictions: number[] = [0.1, 0.3, 0.7, 0.9];
const actual: number[] = [0, 0, 1, 1];

console.log('MAE:', calculateMAE(predictions, actual));
console.log('MSE:', calculateMSE(predictions, actual));
console.log('R²:', calculateR2(predictions, actual));
console.log('Accuracy:', calculateAccuracy([0, 0, 1, 1], actual));
console.log('AUC-ROC:', calculateAUCROC(predictions, actual));
*/
