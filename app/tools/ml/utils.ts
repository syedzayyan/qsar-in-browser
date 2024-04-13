export default function MLUtils(){
    const results = globalThis.metrics.toJs();
    const results_mae = results.map((arr) => arr[0]);
    const results_r2 = results.map((arr) => arr[1]);

    let flatData = [];
    globalThis.perFoldPreds.toJs().flatMap(subArray => {
        let anArray = []
        subArray[0].map((_, index) => {
            anArray.push({ x: subArray[0][index], y: subArray[1][index] });
        });
        flatData.push(anArray);
    });

    return [results_mae, results_r2, flatData];
}