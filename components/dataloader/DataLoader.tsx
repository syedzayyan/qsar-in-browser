import CSVLoader from "./CSVLoader";
import TargetGetter from "./TargetGetter";

export default function DataLoader() {
    return (
        <div className="data-loader-container">
            <div style  = {{width : "100%"}}>
                <h2>Fetch the data</h2>
                <p>Starting off with analysis, we need data.
                    For now, you could use the in-built program to fetch data format
                    ChEMBL, or you can use your own dataset in a CSV format. If you are lost
                    or just want to try the program out, I'd the ChEMBL program with the CHEMBL223 Target.
                </p>
            </div>
            <br />
            <div className="centered-self-container">
                <TargetGetter />
                <CSVLoader />
            </div>
        </div>
    )
}