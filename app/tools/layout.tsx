"use client"

import { useContext, useEffect, useState } from "react";
import CornerMenu, { MenuItem } from "../../components/ui-comps/CornerMenu";
import PyodideContext from "../../context/PyodideContext";
import RDKitContext from "../../context/RDKitContext";
import { initRDKit } from "../../components/utils/rdkit_loader";
import Loader from "../../components/ui-comps/Loader";
import Script from "next/script";
import LigandContext from "../../context/LigandContext";
import { useRouter } from 'next/navigation'

const menuItems: MenuItem[] = [
    {
      label : "Pre-Processing",
      link : "/tools/preprocess"
    },
    {
      label: 'Distributions', link: '#', subMenuItems: [{
        label: 'Activity',
        link: '/tools/activity'
      }, {
        label: 'Tanimoto',
        link: '/tools/tanimoto'
      }]
    }, {
      label: 'Dimensionality Reduction', link: '#', subMenuItems: [{
        label: 'PCA',
        link: '/tools/dim-red#pca'
      }, {
        label: 'tSNE',
        link: '/tools/dim-red#tsne'
      }]
    },
    {
      label: 'Scaffold Analysis', link: '#', subMenuItems: [{
        label: 'MMA',
        link: '/tools/mma'
      }]
    },
    {
      label: 'Machine Learning', link: '#', subMenuItems: [{
        label: 'Random Forest',
        link: '/tools/ml#rf'
      }, {
        label: 'XGBoost',
        link: '/tools/ml#xgboost'
      }]
    },
  ];

export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) 
  { 
    const { setPyodide } = useContext(PyodideContext);
    const { setRDKit } = useContext(RDKitContext);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('Loading Pyodide...')
    const { ligand } = useContext(LigandContext);
    const router = useRouter();

    useEffect(() => {
      if (ligand.length < 1){
        router.push('/load_data');
      }
    }, [])

    async function loadRDKit() {
      const RDK = await initRDKit();
      return RDK
    }

    async function pyodideLoaded() {
      globalThis.loadPyodide().then((pyodide) => {
        pyodide.loadPackage(['scikit-learn', 'numpy']).then(() => {
          setPyodide(pyodide)
        })
      })
      setLoadingText("Loading RDKit")
      loadRDKit().then(RDK => {setRDKit(RDK);setLoading(false)});
    }

    if (ligand.length > 1){
      return (
        <div className='main-container'>
          <Script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" onLoad={pyodideLoaded}></Script>
          {loading ? (
            <Loader loadingText={loadingText}/>
          ) : (
            <>
              <CornerMenu items = {menuItems}/>
              {children}
            </>
          )}
        </div>
      );      
    } else {
      return (
        <></>
      )
    }
  }