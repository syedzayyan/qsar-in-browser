"use client"

import { useState, useEffect, useRef, useContext } from "react";
import LigandContext from "../../../context/LigandContext";
import Histogram from "../../../components/tools/toolViz/Histogram";
import { mean, median, mode } from "mathjs";

export default function Activity(){
    const {ligand} = useContext(LigandContext);
    var data = ligand.map((obj) => obj["neg_log_activity_column"]);

    return(
        <div className="tools-container">
            <Histogram data = {data} xLabel="Count" yLabel="Activity"/>
            <div className="">
                <span>Activity Stats</span>     
                <br />
                <span>Mean : {mean(data)} || Median : {median(data)} || Mode : {mode(data)}</span>                  
            </div>
   
        </div>
    )
}