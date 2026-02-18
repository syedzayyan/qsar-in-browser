"use client"

import { useContext, useEffect, useState } from "react";
import Histogram from "../../../components/tools/toolViz/Histogram";
import DataTable from "../../../components/ui-comps/PaginatedTables";
import { ScreenDataContext } from "./layout";
import TargetContext from "../../../context/TargetContext";
import DataTable2 from "../../../components/ui-comps/PaginatedTables2";

export default function Screen() {
  const screenData = useContext(ScreenDataContext);
  const { target } = useContext(TargetContext);

  const [preds, setPreds] = useState([]);
  const [sortedScreenData, setSortedScreenData] = useState([]);

  useEffect(() => {
    let newScreenData = [...screenData]; // Create a copy to avoid mutating original
    let computedPreds = [];
    
    if (screenData?.length > 0) {
      computedPreds = screenData.map((x, i) => {
        const preds = x?.predictions;
        // Detect typed array or array
        if (preds && preds.length && preds.length > 0) {
          if (preds.length === 2) {
            newScreenData[i].predictions = preds[1] > 0.5 ? 1.0 : 0.0;
            return preds[1] > 0.5 ? 1.0 : 0.0;
          }
          // Multi-class argmax
          let maxIndex = 0;
          for (let i = 1; i < preds.length; i++) {
            if (preds[i] > preds[maxIndex]) {
              maxIndex = i;
            }
          }
          newScreenData[i].predictions = maxIndex;
          return maxIndex;
        }
        newScreenData[i].predictions = preds;
        return preds;
      }).filter(p => p !== null);
      
      // Sort by predictions (descending order)
      newScreenData.sort((a, b) => Number(b.predictions) - Number(a.predictions));
      
      setSortedScreenData(newScreenData);
      setPreds(computedPreds);
    }
  }, [screenData, target]);

  const downloadCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      sortedScreenData.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {sortedScreenData.length > 0 && sortedScreenData[0].predictions !== undefined && (
        <>
          <Histogram data={preds} />
          <br />
          <button className="button" onClick={downloadCsv}>
            Download Predictions in CSV Format
          </button>
          &nbsp;
          <DataTable2
            data={sortedScreenData}
            rowsPerPage={5}
            act_column={["predictions"]}
            onSelectionChange={() => { }}
            checkboxExistence={false}
          />
        </>
      )}
    </>
  );
}
