export default function convertToJSON(array: string[][]) {
    const objArray: { [key: string]: string }[] = [];

    for (let i = 1; i < array.length; i++) {
        objArray[i - 1] = {};

        for (let k = 0; k < array[0].length && k < array[i].length; k++) {
            const key = array[0][k];
            objArray[i - 1][key] = array[i][k];
        }
    }

    return objArray;
}