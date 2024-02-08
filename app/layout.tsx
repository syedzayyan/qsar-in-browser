"use client"

import { useState } from "react";
import Navbar from "../components/ui-comps/Navbar"
import "../styles/index.css"
import ThemeContext from "../context/ThemeContext";
import Head from "next/head";
import { TargetProvider } from "../context/TargetContext";
import { LigandProvider } from "../context/LigandContext";
import { RDKitProvider } from "../context/RDKitContext";
import { PyodideProvider } from "../context/PyodideContext";

export default function RootLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const [theme, setTheme] = useState("light");
    return (
      <ThemeContext.Provider value={{ theme, setTheme }}>
      <html lang="en">
        <Head>
          <link rel="shortcut icon" href="favicon.ico" />  
        </Head>
        <body className={`container-${theme}`}>
          <Navbar />
          <div className="about-container">
            <TargetProvider>
              <LigandProvider>
                <RDKitProvider>
                  <PyodideProvider>
                    {children} 
                  </PyodideProvider>
                </RDKitProvider>
              </LigandProvider>
            </TargetProvider>  
          </div>       
        </body>
      </html>
      </ThemeContext.Provider>
    )
  }