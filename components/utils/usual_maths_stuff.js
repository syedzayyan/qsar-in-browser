export default class StatisticsCalculator {
    static calculateMedian(times) {
        const sortedTimes = [...times].sort((a, b) => a - b);
        return times.length % 2 === 0 ? (sortedTimes[times.length / 2 - 1] + sortedTimes[times.length / 2]) / 2 : sortedTimes[Math.floor(times.length / 2)];
    }

    static calculateMode(times) {
        const modeMap = times.reduce((map, val) => (map[val] = (map[val] || 0) + 1, map), {});
        const mode = Object.keys(modeMap).reduce((a, b) => modeMap[a] > modeMap[b] ? a : b);
        return mode;
    }

    static calculateMean(times) {
        return times.reduce((a, b) => a + b, 0) / times.length;
    }

    static calculateStandardDeviation(times) {
        const mean = StatisticsCalculator.calculateMean(times);
        const stdDev = Math.sqrt(times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length);
        return stdDev;
    }
}

