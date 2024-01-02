import { useContext, useEffect, useState } from "react";
import LigandContext from "../context/LigandContext";
import { RandomForestRegression as RFRegression } from 'ml-random-forest';
import { initRDKit } from './utils/rdkit_loader'
import * as tf from '@tensorflow/tfjs'
import * as sk from 'scikitjs'
sk.setBackend(tf)

import Loader from './Loader';
import GroupedBarChart from "./BarChart";

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

        const kf = new sk.KFold({ nSplits: 5 });  

        const mae_through_folds = []
        const r2_through_folds = []
        for (const { trainIndex, testIndex } of kf.split(X, y)) {
            try {
                const regression = new RFRegression({
                    seed: 3,
                    maxFeatures: 0.5,
                    replacement: false,
                    nEstimators: 80
                });

                const XTrain = Array.from(trainIndex.dataSync()).map(i => X[i]);
                const yTrain= Array.from(trainIndex.dataSync()).map(index => y[index]);
                regression.train(XTrain, yTrain);

                const XTest = Array.from(testIndex.dataSync()).map(i => X[i]);
                const yTest= Array.from(testIndex.dataSync()).map(i => y[i]);
                const result = regression.predict(XTest);

                let mae_test = sk.metrics.meanAbsoluteError(yTest, result);
                let r2_test = sk.metrics.r2Score(yTest, result);

                console.log(mae_test, r2_test)

                mae_through_folds.push(mae_test)
                r2_through_folds.push(r2_test)
            }
            finally {
                trainIndex.dispose()
                testIndex.dispose()
            }
        }

        const regression2 = new RFRegression({
            seed: 3,
            maxFeatures: 0.5,
            replacement: false,
            nEstimators: 80
        });

        regression2.train(X, y);
        setRFModelState(regression2.toJSON());
        setRFMAE([mae_through_folds, r2_through_folds]);
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
            <div className="main-container">
                <div className="container">
                <Loader />
                </div>
            </div>
           
        )
    }

    return(
        <div className="main-container">
            <div className="container">
                {stateOfRDKit ? (<span>RDKit is Loaded ✅</span>) : (<span>Loading RDKit</span>)}

                <h3>Random Forest performance across 5 folds</h3>
                <GroupedBarChart mae = {rfMAE[0]} r2={rfMAE[1]} />

                <input className="input" type="text" placeholder = {testSMILES} onChange={(e) => settestSMILES(e.target.value)}></input>
                <br></br>
                <button className="button" onClick={predictionerRF}>Predict on SMILES</button>
                <br></br><br></br>
                <span>{predictedRFMAE}</span>
            </div>
        </div>
    )
}