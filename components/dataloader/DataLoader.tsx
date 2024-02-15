import CSVLoader from "./CSVLoader";
import TargetGetter from "./TargetGetter";

export default function DataLoader() {
    return (
        <div className="data-loader-container">
            <div style  = {{width : "60%", margin : "0 auto"}}>
                <h2>Fetch the data</h2>
                <p>Starting off with analysis, we need data.
                    For now, you could use the in-built program to fetch data format
                    ChEMBL, or you can use your own dataset in a CSV format. If you are lost
                    or just want to try the program out, I'd suggest the ChEMBL program with the CHEMBL223 Target.
                    ChEMBL is a bioactivity database, and you could find details about it&nbsp;
                    <a href="https://www.ebi.ac.uk/chembl/" target="_blank" rel="noopener noreferrer">here</a>
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