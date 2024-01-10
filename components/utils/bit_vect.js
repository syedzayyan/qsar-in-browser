export default function bitStringToBitVector(bitString) {
    let bitVector = [];
    for (let i = 0; i < bitString.length; i++) {
      // Convert each character to a numeric value (0 or 1) and push it to the bitVector array
      bitVector.push(parseFloat(bitString[i]));
    }
    return bitVector;
}