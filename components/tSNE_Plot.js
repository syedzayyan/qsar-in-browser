import { useContext, useEffect, useState } from "react";
import LigandContext from "../context/LigandContext";
import ScatterPlot from './ScatterPlot';
import * as tsnejs from './utils/tsne';
import Loader from "./Loader";

export default function TSNEPlot() {
  const { ligand } = useContext(LigandContext);
  const [tsneData, setTSNEData] = useState(null)

  
  var opt = {}
  opt.epsilon = 10;
  opt.perplexity = 30;
  opt.dim = 2; 
  var tsne = new tsnejs.tSNE(opt);
  useEffect(() => {    
    setTimeout(() => {
      processCompounds();
    }, 500)
  }, []);

    const processCompounds = async () => {
      var fp_storer = ligand.map((obj) => obj.fingerprint);
      try {
        tsne.initDataRaw(fp_storer);
        for (var k = 0; k < 1000; k++) {
          tsne.step(); // every time you call this, solution gets better
        }
        var tsne_data = tsne.getSolution();
        const tsne_data_in = await tsne_data.map(([x, y]) => ({ x, y })); 
        setTSNEData(tsne_data_in)
      } catch (error) {
        console.error("Error:", error);
      }
    };

  if (tsneData === null) {
    return (
      <div className="container">
      <Loader />
      </div>
    )
  }
  return (
    <div className="container">
      <ScatterPlot data={tsneData} width={600} height={600} colorProperty={ligand.map((obj) => obj.pKi)}/>
    </div>
  )
}
