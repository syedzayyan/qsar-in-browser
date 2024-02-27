"use client"

import { useState } from "react";
import DataLoader from "../components/dataloader/DataLoader";
import { useRouter } from "next/navigation";

export default function IndexPage() {

  const router = useRouter();

  return (
    <div style = {{marginTop : "40px"}}>
        <div className="content-wrapper">
          <div className="image-container">
            <img src="logo.svg" alt="Logo" />
          </div>
          <div className="text-container">
            <h1>Cheminformatics in Your Browser Without Writing Code!</h1>
            <br></br>
            <p className="larger-text">
              QITB simplifies the world of chemistry and data analysis. Easily
              upload chemical data or fetch it from trusted resources, and the
              user-friendly interface lets you explore molecular structures,
              analyze them, and run ML models to explore newer chemical
              structures. With everything running securely in your browser, it's
              a hassle-free way to uncover insights into molecules without any coding required.
              Also....the code behind this app is open source.
            </p>
            <br></br>
            <button className="button" onClick={() => {router.push("/load_data")}}>
              <h1>Start Here!</h1>
            </button>
          </div>
        </div>
        <br />
        <br />

        <div className="content-wrapper">
          <div className="image-container">
            <img src="/pics/dist.png" height = "100%" width="100%" alt="Logo" />
          </div>
          <div className="text-container">
            <h1>Analyse molecules with distributions</h1>
            <br></br>
            <p className="larger-text">
                Decode the unseen world of small molecules through dynamic histograms. 
                Explore molecular relationships with Tanimoto Coefficient. 
                It's your shortcut to understanding the intricate dance of tiny particles.
            </p>
          </div>
        </div>

        <br />
        <br />
        <div className="content-wrapper">
          <div className="image-container">
            <img src="/pics/dim_red.png" height = "100%" width="100%" alt="Logo" />
          </div>
          <div className="text-container">
            <h1>Analyse molecules with distributions</h1>
            <br></br>
            <p className="larger-text">
              Immerse yourself further in the molecular realm as QITB employs advanced dimension reduction techniques like PCA and tSNE on fingerprints. Right in the browser. 
              Imagine condensing complex molecular data into streamlined, meaningful patterns. 
              This feature enhances your exploration, providing a simplified yet comprehensive view of molecular landscapes.
              Uncover the elegance of molecular structures with this innovative tool, making your journey into chemistry both enlightening and efficient. 
            </p>
          </div>
        </div>

        <br />
        <br />
        <div className="content-wrapper">
          <div className="image-container">
            <img src="/pics/ml_rf.png" height = "100%" width="100%" alt="Logo" />
          </div>
          <div className="text-container">
            <h1>Run ML Based QSAR models right in the browser!</h1>
            <br></br>
            <p className="larger-text">
              Dive into the cutting-edge world of our cheminformatics app, where we leverage the power of QSAR ML models, 
              including Random Forest and XGBoost. 
              Picture these models as expert guides, decoding the language of molecules. 
              Through intricate algorithms, they predict and analyze molecular behaviors, providing you with valuable insights. 
              With detailed model reports at your fingertips, unravel the predictions and understand the factors influencing molecular activities. 
              It's like having a one stop tool right in your pocket
            </p>
          </div>
        </div>
    </div>
  );
}
