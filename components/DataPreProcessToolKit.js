import { useContext, useEffect, useState } from "react";
import LigandContext from "../context/LigandContext";
import { PCA } from 'ml-pca';
import { initRDKit } from './utils/rdkit_loader'
import ScatterPlot from './ScatterPlot';
import tsnejs from 'tsne'


var opt = {}
opt.epsilon = 10; // epsilon is learning rate (10 = default)
opt.perplexity = 30; // roughly how many neighbors each point influences (30 = default)
opt.dim = 2; // dimensionality of the embedding (2 = default)

var tsne = new tsnejs.tSNE(opt); // create a tSNE instance

export default function PreProcess() {
  const { ligand } = useContext(LigandContext);
  const [pcaData, setPCAData] = useState(false)

  const [rdload, setRDload] = useState(false);
  const [rdkitting, updateRdkitting] = useState(null);
  const [progress, setProgress] = useState(0);
  const totalCompounds = ligand.length;

  useEffect(() => {
    const processCompounds = async () => {
      try {
        const RDKit = await initRDKit();
        updateRdkitting(RDKit);

        const fp_storer = [];

        for (let i = 0; i < totalCompounds; i++) {
          try {
            const mol = RDKit.get_mol(ligand[i].canonical_smiles);
            const mol_fp = mol.get_morgan_fp_as_uint8array(JSON.stringify({ radius: 2, nBits: 2048 }));
            fp_storer.push(mol_fp);
            const newProgress = i + 1;
            setProgress(newProgress);
            mol?.delete()
          } catch (e) {
            console.error(e);
          }
        }

        try {
          const pca = new PCA(fp_storer);
          const pca_data_raw = pca.predict(fp_storer, { nComponents: 2 });

          const pca_data_in = pca_data_raw.data.map(([x, y]) => ({ x, y }));
          setPCAData(pca_data_in)

        } catch (error) {
          console.error("Error:", error);
        }

        try {
          tsne.initDataDist(fp_storer);
          
          for(var k = 0; k < 500; k++) {
            tsne.step(); // every time you call this, solution gets better
          }
          
          var Y = tsne.getSolution(); // Y is an array of 2-D points that you can plot
          
          console.log(Y)

        } catch (error) {
          console.error("Error:", error);
        }

        setRDload(true);
      } catch {
        console.log('Do Something About RDKit');
      }
    };

    processCompounds();
  }, [ligand, totalCompounds]);

  if (rdload) {
    return (
      <div className="container">
        <div>Number of Data Points Processed: {progress}</div>
        <progress className="progress-bar" value={progress} max={totalCompounds}></progress>
        <br></br>
        {pcaData && <ScatterPlot data={pcaData} width={600} height={600} />}
      </div>
    );
  }

  return <>Processing...</>;
}
