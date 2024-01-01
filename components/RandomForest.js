import { useContext, useEffect, useState } from "react";
import LigandContext from "../context/LigandContext";
import { RandomForestRegression as RFRegression } from 'ml-random-forest';
import { initRDKit } from './utils/rdkit_loader'
import * as tf from '@tensorflow/tfjs'
import * as sk from 'scikitjs'
sk.setBackend(tf)

import Loader from './Loader';

export default function RandomForest(){
    const { ligand } = useContext(LigandContext);
    const [rfRun, setRFRun] = useState(false);
    const [rfMAE, setRFMAE] = useState(0);
    const [rfModel, setRFModelState] = useState({})
    const [testSMILES, settestSMILES] = useState('C1=NC(=C2C(=N1)N(C=N2)C3C(C(C(O3)CO)O)O)N')

    const [RDKit, setRDKit] = useState(null);
    const [stateOfRDKit, setStateOfRDKit] = useState(false);

    const [predictedRFMAE, setPredictedRFMAE] = useState('Yet to be predicted')

    useEffect(() => {
        setTimeout(() => {
            rfRunner();
        }, 1000)

        async function loadRDKit() {
            const RDK = await initRDKit()
            setRDKit(RDK);
            setStateOfRDKit(true);
          }
        loadRDKit();
    }, []);

    const rfRunner = () => {
        setRFRun(false)
        var X = ligand.map((obj) => obj.fingerprint);
        var y = ligand.map((obj) => obj.pKi);

        let [XTrain, XTest, yTrain, yTest] = sk.trainTestSplit(X, y, 0.2)
        const regression = new RFRegression({
            seed: 3,
            maxFeatures: 2,
            replacement: false,
            nEstimators: 120
        });
        regression.train(XTrain, yTrain);
        const result = regression.predict(XTest);
        let mae_test = sk.metrics.meanAbsoluteError(yTest, result);
        let r2_test = sk.metrics.r2Score(yTest, result);

        regression.train(X, y);
        setRFModelState(regression.toJSON());
        setRFMAE([mae_test, r2_test]);
        setRFRun(true)
    }

    const predictionerRF = () => {
        setPredictedRFMAE('Processing....');
        const mol = RDKit.get_mol(testSMILES);
        const mol_fp = mol.get_morgan_fp_as_uint8array(JSON.stringify({ radius: 2, nBits: 2048 }));
        const regression = RFRegression.load(rfModel);
        const result = regression.predict([mol_fp]);  
        setPredictedRFMAE(result);
        mol?.delete()
    }

    if (!rfRun) {
        return(
            <Loader />
        )
    }

    return(
        <div className="main-container">
            <div className="container">
                {stateOfRDKit ? (<span>RDKit is Loaded ✅</span>) : (<span>Loading RDKit</span>)}
                <p>RF MAE on 20% Split : {rfMAE[0]}</p>
                <p>RF R2 on 20% Split : {rfMAE[1]}</p>
                <input className="input" type="text" placeholder = {testSMILES} onChange={(e) => settestSMILES(e.target.value)}></input>
                <br></br>
                <button className="button" onClick={predictionerRF}>Predict on SMILES</button>
                <br></br><br></br>
                <span>{predictedRFMAE}</span>
            </div>
        </div>
    )
}