"use client"

import { useContext, useEffect, useState } from "react";
import Histogram from "../../../components/tools/toolViz/Histogram";
import DataTable from "../../../components/ui-comps/PaginatedTables";
import { ScreenDataContext } from "./layout";
import TargetContext from "../../../context/TargetContext";

export default function Screen() {
    const screenData = useContext(ScreenDataContext);
    const { target } = useContext(TargetContext);

    const [preds, setPreds] = useState([]);

    useEffect(() => {
        if (!screenData?.length) return;

        let computedPreds = screenData.map(x => {
            if (!x.predictions || x.predictions.length < 2) return null;

            const preds = Array.from(x.predictions);

            return target?.machine_learning_inference_type === "classification"
                ? preds[0] > preds[1] ? 1 : 0
                : preds;
        });
        console.log(computedPreds);
        setPreds(computedPreds);
    }, [screenData, target]);


    const downloadCsv = () => {
        const csvContent =
            "data:text/csv;charset=utf-8," +
            screenData.map(row => Object.values(row).join(",")).join("\n");

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
            {screenData.length > 0 && screenData[0].predictions !== undefined && (
                <>
                    <Histogram data={preds} />
                    <br />
                    <button className="button" onClick={downloadCsv}>
                        Download Predictions in CSV Format
                    </button>
                    &nbsp;
                    <DataTable
                        data={screenData}
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
