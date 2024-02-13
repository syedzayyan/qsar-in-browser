import bitStringToBitVector from "./bit_vect";

export default function fpSorter(fpType : string, smilesString: string, rdkit, path? : number, nBits?: number){
    const mol = rdkit.get_mol(smilesString);
    let molFP;
    if (fpType === "maccs"){
        molFP = mol.get_maccs_fp();
    } else if (fpType === "morgan") {
        molFP = mol.get_morgan_fp(JSON.stringify({ radius: path, nBits: nBits }));
    } else if (fpType === "rdkit_fp") {
        molFP = mol.get_rdkit_fp(JSON.stringify({ minPath: path, nBits: nBits }));
    } else {
        throw new Error("Error has happened")
    }
    mol.delete();
    return bitStringToBitVector(molFP)
}