import { useContext, useState, useEffect } from "react";
import LigandContext from "../../../context/LigandContext";
import { initRDKit } from '../../utils/rdkit_loader'
import Card from '../toolViz/Card';
import MoleculeStructure from "./MoleculeStructure";
import Loader from '../../ui-comps/Loader';
import ModalComponent from "../../ui-comps/ModalComponent";

export default function MMA() {
    const { ligand } = useContext(LigandContext);
    const [RDKit, setRDKit] = useState(null);
    const [stateOfRDKit, setStateOfRDKit] = useState(false);
    const [scaffCores, setScaffCores] = useState([]);
    const [scaffCoreLoaded, setScaffCoresLoaded] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [specificMolArray, setSpecificMolArray] = useState([]);


    const openModal = () => {
      setModalOpen(true);
    };
    const closeModal = () => {
      setModalOpen(false);
    };

    useEffect(() => {
        async function loadRDKit() {
            const RDK = await initRDKit()
            setRDKit(RDK);
            setStateOfRDKit(true);
        }
        loadRDKit();
    }, [ligand])

    useEffect(() => {
        if (stateOfRDKit) {
            const scaff_cores = scaffoldArrayGetter(ligand);
            setScaffCores(scaff_cores);
            setScaffCoresLoaded(true);
        }
    }, [stateOfRDKit])

    function scaffoldArrayGetter(row_list_s) {
        let massive_array = [];

        row_list_s.map((x, i) => {
            const mol = RDKit.get_mol(x.canonical_smiles);
            let sidechains_smiles_list = []
            let cores_smiles_list = []
            try {
                const mol_frags = mol.get_mmpa_frags(1, 1, 20);
                while (!mol_frags.sidechains.at_end()) {
                    var m = mol_frags.sidechains.next();
                    var { molList, _ } = m.get_frags();
                    try {
                        let fragments = [];
                        while (!molList.at_end()) {
                            var m_frag = molList.next();
                            fragments.push(m_frag.get_smiles())
                            m_frag.delete();
                        }
                        molList.delete()
                        cores_smiles_list.push(fragments.at(0))
                        sidechains_smiles_list.push(fragments.at(1))
                        massive_array.push([x.canonical_smiles, fragments.at(0), fragments.at(1), x.id, x.pKi])
                        m.delete()
                        mol_frags.cores.delete()
                        mol_frags.sidechains.delete()
                    } catch {
                        console.log("For Some Reason There are Null Values")
                    }
                }
            } catch {
                console.log('Problem')
            }
            row_list_s[i]['Cores'] = cores_smiles_list;
            row_list_s[i]['R_Groups'] = sidechains_smiles_list;
            mol.delete()
        })

        let countArray = {};
        for (let i = 0; i < massive_array.length; i++) {
            if (massive_array[i].length > 1) {
                let secondElement = massive_array[i][1];
                countArray[secondElement] = (countArray[secondElement] || 0) + 1;
            }
        }
        let scaffoldArray = Object.entries(countArray);
        let filteredArrayOfScaffolds = scaffoldArray.filter(([_, count]) => typeof count === 'number' && count >= 2);

        return [filteredArrayOfScaffolds, massive_array];
    }

    function scaffoldFinder(cores){
        const selectedArrays = scaffCores[1].filter(array => {
            // Replace 'condition' with your specific condition for the third component
            return array[1] === cores;
        });
        setSpecificMolArray(selectedArrays)
        openModal();
    }

    if (scaffCoreLoaded) {
        return (
            <div className="main-container">
                <div className="container-for-cards">
                    {scaffCores[0].map((cores, key) => (
                        <Card key={key}>
                            <MoleculeStructure structure={cores[0]} id={cores[0]} svgMode />
                            <br />
                            <span>Count : {cores[1]}</span>
                            <br /><br />
                            <button onClick={() => {scaffoldFinder(cores[0])}} className="button">Matched Molecules</button>
                        </Card>
                    ))}
                </div>
                <ModalComponent isOpen={isModalOpen} closeModal={closeModal}>
                {specificMolArray.map((cores, key) => (
                        <Card key={key}>
                            <MoleculeStructure structure={cores[0]} subStructure={cores[1]} id={cores[0]} svgMode />
                            <br></br>
                            <span>pKi : {cores[4]}</span>
                            {console.log(cores[3])}
                        </Card>
                    ))}
                </ModalComponent>
            </div>
        )
    } else {
        return (
            <div className="main-container">
                <Loader loadingText="Chopping up molecules and analysing them....a bit"/>
            </div>
        )
    }
}