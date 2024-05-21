export function separateDuplicates(arr, id_col_name) {
    const countMap = {};
    const duplicates = [];
    const singles = [];

    // Count occurrences of each ID
    arr.forEach(obj => {
        const id = obj["id"];
        countMap[id] = (countMap[id] || 0) + 1;
    });

    // Separate objects based on counts
    arr.forEach(obj => {
        const id = obj["id"];
        if (countMap[id] > 1) {
            duplicates.push(obj);
        } else {
            singles.push(obj);
        }
    });

    return { duplicates, singles };
}