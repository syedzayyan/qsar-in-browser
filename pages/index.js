import dynamic from "next/dynamic";
import { TargetProvider } from "../context/TargetContext";
import { LigandProvider } from "../context/LigandContext";

import Head from "next/head";
import Histogram from "../components/Histogram";

const MoleculeStructure = dynamic(
  () => import("../components/MoleculeStructure"),
  { ssr: false }
);

const FPGen = dynamic(
  () => import("../components/rdkit_fp"),
  { ssr: false }
);

const TargetGetter = dynamic(
  () => import("../components/TargetGetter"),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <Head>
        <title>SAR IN BROWSER</title>
      </Head>

      <TargetProvider>
        <LigandProvider>
          <TargetGetter />
        </LigandProvider>
      </TargetProvider>
      
    </>
  );
}


