import { useContext, useState, useEffect } from "react";
import LigandContext from "../../../context/LigandContext";
import { initRDKit } from '../../utils/rdkit_loader'
import Card from '../toolViz/Card';
import MoleculeStructure from "./MoleculeStructure";
import Loader from '../../ui-comps/Loader';
import ModalComponent from "../../ui-comps/ModalComponent";
import kstest from "@stdlib/stats-kstest";
import cdf from "@stdlib/stats-base-dists-normal-cdf";
import { ksTest } from "../../utils/ks_test";

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
        let neg_log_activity_column = ligand.map((obj) => obj.neg_log_activity_column);
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
                        massive_array.push([x.canonical_smiles, fragments.at(0), fragments.at(1), x.id, x.neg_log_activity_column])
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
            if (massive_array[i].length >= 5) { // Ensure there are at least 5 elements in the subarray
                let secondElement = massive_array[i][1];
                let fifthElement = massive_array[i][4]; // Assuming the fifth element is at index 4

                if (!countArray[secondElement]) {
                    countArray[secondElement] = [0, []];
                }

                countArray[secondElement][0]++;
                countArray[secondElement][1].push(fifthElement);
            }
        }

        let scaffoldArray = Object.entries(countArray);
        let filteredArrayOfScaffolds = scaffoldArray.filter(([key, count]) =>
            typeof count[0] === 'number' &&
            count[0] >= 2 &&
            key.length > 9
        );


        filteredArrayOfScaffolds = filteredArrayOfScaffolds.map(x => {
            return [x[0], [x[1][0], ksTest(x[1][1], neg_log_activity_column)]]
        })

        filteredArrayOfScaffolds.sort((a, b) => a[1][1] - b[1][1]);

        console.log(filteredArrayOfScaffolds)
        return [filteredArrayOfScaffolds, massive_array];
    }

    function scaffoldFinder(cores) {
        const selectedArrays = scaffCores[1].filter(array => {
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
                            <span>Count : {cores[1][0]}</span>
                            <br /><br />
                            <button onClick={() => { scaffoldFinder(cores[0]) }} className="button">Matched Molecules</button>
                        </Card>
                    ))}
                </div>
                <ModalComponent isOpen={isModalOpen} closeModal={closeModal}>
                    {specificMolArray.map((cores, key) => (
                        <Card key={key}>
                            <MoleculeStructure structure={cores[0]} subStructure={cores[1]} id={cores[0]} svgMode />
                            <br></br>
                            <span>Activity : {cores[4]}</span>
                            {console.log(cores[3])}
                        </Card>
                    ))}
                </ModalComponent>
            </div>
        )
    } else {
        return (
            <div className="main-container">
                <Loader loadingText="Chopping up molecules and analysing them....a bit" />
            </div>
        )
    }
}