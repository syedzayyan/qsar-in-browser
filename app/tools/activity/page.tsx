"use client"

import { useState, useEffect, useRef, useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import { mean, median, mode } from "mathjs";

export default function Activity(){
    const {ligand} = useContext(LigandContext);
    var data = ligand.map((obj) => obj.pKi);

    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            const newSize = containerRef.current.getBoundingClientRect();
            setContainerSize({ width: newSize.width, height: newSize.height });
        };
        handleResize();
    }, []);

    return(
        <div className="tools-container" ref={containerRef}>
            <Histogram data = {data} width={containerSize.width} height={containerSize.height} xLabel="Count" yLabel="Activity"/>
            <div className="">
                <span>Activity Stats</span>     
                <br />
                <span>Mean : {mean(data)} || Median : {median(data)} || Mode : {mode(data)}</span>                  
            </div>
   
        </div>
    )
}