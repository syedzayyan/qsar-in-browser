"use client"

import { useRouter } from "next/navigation";

export default function IndexPage() {

    const router = useRouter();

    return (
        <div className="container">
            <div className="content-wrapper" style={{ marginTop: "60px" }}>
                <div className="image-container">
                    <img src="logo.svg" alt="Logo" />
                </div>
                <div className="text-container">
                    <h1>Cheminformatics in Your Browser Without Writing Code!</h1>
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
                    <button className="button" onClick={() => { router.push("/tools/load_data") }}>
                        <h1>Start Here!</h1>
                    </button>
                </div>
            </div>
            <br />
            <div className="content-wrapper">
                <img src="/layout.png" height="100%" width="100%" alt="Logo" />
            </div>
        </div>
    );
}
