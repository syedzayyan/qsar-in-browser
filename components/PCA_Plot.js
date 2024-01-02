import { useContext, useEffect, useState } from "react";
import LigandContext from "../context/LigandContext";
import { PCA } from 'ml-pca';
import ScatterPlot from './ScatterPlot';
import Loader from './Loader';


export default function PCAPlot() {
  const { ligand } = useContext(LigandContext);
  const [pcaData, setPCAData] = useState(null)

  useEffect(() => {
    setTimeout(() => {
      processCompounds();
    }, "1000");

    const processCompounds = () => {
      var fp_storer = ligand.map((obj) => obj.fingerprint);
        try {
          const pca = new PCA(fp_storer);
          const pca_data_raw = pca.predict(fp_storer, { nComponents: 2 });

          const pca_data_in = pca_data_raw.data.map(([x, y]) => ({ x, y }));
          setPCAData(pca_data_in)
        } catch (error) {
          console.error("Error:", error);
        }
    };
    
  }, []);

    if(pcaData === null){
      return(
        <div className="container">
          <Loader />
        </div>
      )
    }
    return (
      <div className="main-container">
        <br></br>
        {pcaData && <ScatterPlot data={pcaData} width={600} height={600} colorProperty={ligand.map((obj) => obj.pKi)} hoverProp = {ligand.map((obj) => obj.canonical_smiles)}/>}
      </div>
    );
}
