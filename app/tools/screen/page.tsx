"use client"

import { useContext } from "react";
import Histogram from "../../../components/tools/toolViz/Histogram";
import DataTable from "../../../components/ui-comps/PaginatedTables";
import { ScreenDataContext } from "./layout";

export default function Screen() {
    const screenData = useContext(ScreenDataContext);


    const downloadCsv = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            screenData.map(row => Object.values(row).join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    return (
        <>
            {screenData.length > 0 && (
                <>
                    {screenData[0].predictions != undefined &&
                        <>
                            <Histogram data={screenData.map(x => x.predictions)} />
                            <br />
                            <button className="button" onClick={downloadCsv}>
                                Download Predictions in CSV Format
                            </button>
                            &nbsp;
                            <DataTable data={screenData} rowsPerPage={5} act_column={["predictions"]}/>
                        </>
                    }
                </>
            )}
        </>
    )
}
