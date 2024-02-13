"use client"

import { useState, useEffect, useRef, useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import RDKitContext from "../../../context/RDKitContext";
import TanimotoSimilarity from "../../../components/utils/tanimoto";
import fpSorter from "../../../components/utils/fp_sorter";

export default function Tanimoto(){
    const {ligand} = useContext(LigandContext);
    const {rdkit} = useContext(RDKitContext);
    
    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [taniData, setTaniData] = useState([]);
    const [anchorMol, setAnchorMol] = useState("CCO");

    function tanimotoDist(){
        const mol_fp = fpSorter(
            localStorage.getItem("fingerprint"),
            anchorMol,
            rdkit,
            parseInt(localStorage.getItem("path")),
            parseInt(localStorage.getItem("nBits")),
        )
        const data = ligand.map((x) => {
            const tanimoto = TanimotoSimilarity(x.fingerprint, mol_fp)
            return tanimoto
        })
        setTaniData(data)
    }

    useEffect(() => {
        const handleResize = () => {
            const newSize = containerRef.current.getBoundingClientRect();
            setContainerSize({ width: newSize.width, height: newSize.height });
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    

    return(
        <div className="tools-container" ref={containerRef}>
            <input defaultValue={anchorMol} type="text" className="input" onChange={(e) => setAnchorMol(e.target.value)}/>
            <button className="button" onClick={tanimotoDist}>Generate Graph</button>
            {taniData.length != 0 && 
                <>
                <Histogram 
                    data = {taniData} 
                    width={containerSize.width} 
                    height={containerSize.height} 
                    xLabel="Tanimoto Scores" 
                    yLabel="Count"/>           
                </>
            }
        </div>
    )
}