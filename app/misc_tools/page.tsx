"use client"

import JSME from "../../components/tools/toolViz/JSMEComp";

export default function JSMEPOPO() {
    function handleChange(smiles){
        console.log(smiles)
    }
    return (
        <div className="container">
            <div className="content-wrapper" style={{ marginTop: "60px" }}>
                <JSME height="500px" width="500px" onChange={handleChange} id = 'test'/>
            </div>
        </div>
    )
}