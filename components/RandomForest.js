import { useContext, useEffect, useState } from "react";
import LigandContext from "../context/LigandContext";
import { initRDKit } from './utils/rdkit_loader';
import Script from "next/script";
import Loader from './Loader';
import GroupedBarChart from './BarChart';
import bitStringToBitVector from "./utils/bit_vect";

export default function RandomForest() {
  const { ligand } = useContext(LigandContext);
  const [pyodide_ins, setPyodide] = useState(false)
  const [pyodideState, setPyodideState] = useState(false)
  const [rdKit, setRDKit] = useState();
  const [onesmiles, setSMILES] = useState('C1=NC(=C2C(=N1)N(C=N2)C3C(C(C(O3)CO)O)O)N');
  const [oneOffPred, setOneOffPred] = useState();

  useEffect(() => {
    async function loadRDKit() {
      const RDK = await initRDKit()
      setRDKit(RDK);
    }
    loadRDKit();
  })

  const [cpuNum, setCpuNum] = useState(-1);
  const [maxFeats, setMaxFeats] = useState('None');
  const [criterion, setCriterion] = useState('poisson');
  const [nEstimators, setNEstimators] = useState(120);

  const [results, setResults] = useState([]);

  globalThis.fp = ligand.map((obj) => obj.fingerprint);
  globalThis.pKi = ligand.map((obj) => obj.pKi);

  async function pyodideLoaded() {
    loadPyodide().then((pyodide) => {
      pyodide.loadPackage(['scikit-learn', 'numpy']).then(() => {
        setPyodide(pyodide)
        setPyodideState(true)
      })
    })
  }

  function runRandForestModel() {
    pyodide_ins.runPython(`
    import js
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.metrics import mean_absolute_error, r2_score
    from sklearn.model_selection import KFold
    import numpy as np
    import joblib

    param = {
      "n_estimators": 120,
      "criterion": "poisson",
      "max_features" : None,
    }
    model = RandomForestRegressor(**param, n_jobs = -1)

    X = (js.globalThis.fp).to_py()
    y = (js.globalThis.pKi).to_py()

    X = np.array(X)
    y = np.array(y)

    kf = KFold(n_splits=10, shuffle=True)

    metrics = []
    for train, test in kf.split(X, y):
      trainX = X[train]
      trainY = y[train]
      
      testX = X[test]
      testY = y[test]
      
      params = {'n_estimators': ${nEstimators}, 'criterion': '${criterion}', 'max_features': ${maxFeats}, 'n_jobs' : ${cpuNum}}
      model = RandomForestRegressor(**params)

      model.fit(trainX, trainY)
      pred = model.predict(testX)
      metric = [mean_absolute_error(testY, pred), r2_score(testY, pred)]

      print(metric)
      metrics.append(metric)

    js.metrics = metrics

    params = {'n_estimators': ${nEstimators}, 'criterion': '${criterion}', 'max_features': ${maxFeats}, 'n_jobs' : ${cpuNum}}
    model = RandomForestRegressor(**params)
    model.fit(X, y)
    joblib.dump(model, "model.pkl") 
    `
    )
    const results = metrics.toJs();
    const results_mae = results.map((arr) => arr[0]);
    const results_r2 = results.map((arr) => arr[1]);
    setResults([results_mae, results_r2])
  }
  function predictOneOff(){
    const mol = rdKit.get_mol(onesmiles);
    let mol_fp = mol.get_morgan_fp(JSON.stringify({ radius: 2, nBits: 2048 }));
    mol_fp = bitStringToBitVector(mol_fp);
    mol.delete();
    globalThis.one_off_mol_fp = mol_fp;
    pyodide_ins.runPython(`
    import js
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.metrics import mean_absolute_error, r2_score
    from sklearn.model_selection import KFold
    import numpy as np
    import joblib

    X = (js.globalThis.one_off_mol_fp).to_py()

    model = joblib.load("model.pkl")
    js.one_off_y = model.predict([X])
    `
    )

    setOneOffPred(one_off_y.toJs())
  }
  return (
    <div className="main-container">
        <Script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js" onLoad={pyodideLoaded}></Script>
        {pyodideState ? (
          <div className="container">
            <div>
              <label>N_Estimators</label>
              <input className="input" value = {nEstimators} onChange={(e) => setNEstimators(e.target.value)}></input>
              <br />
              <label>Criterion</label>
              <input className="input" value = {criterion} onChange={(e) => setCriterion(e.target.value)}></input>
              <br />
              <label>Max_features</label>
              <input className="input" value = {maxFeats} onChange={(e) => setMaxFeats(e.target.value)}></input>
              <br />
              <label>CPU No:</label>
              <input type = 'number' value = {cpuNum} onChange={(e) => setCpuNum(e.target.value)} className="input"></input>
              <br></br><br></br>
              <button onClick={runRandForestModel} className="button">Run Random Forest Model</button>
            </div>
            {results.length > 0 ? 
            <div>
            <GroupedBarChart mae = {results[0]} r2 = {results[1]} />
            <label>Predict the activity for single compound with SMILES string</label>
            <input className="input" placeholder="C1=NC(=C2C(=N1)N(C=N2)C3C(C(C(O3)CO)O)O)N" onChange={(e) => setSMILES(e.target.value)}></input>
            <br></br><br></br>
            <button className="button" onClick={predictOneOff}>Predict</button>&nbsp;<span>Predicted: {oneOffPred}</span>
            </div> : <></>}
          </div>
        ): <Loader loadingText="Loading Scikit and Numpy"/>}
    </div>
  )
}