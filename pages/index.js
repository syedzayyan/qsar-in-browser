import dynamic from "next/dynamic";
import { TargetProvider } from "../context/TargetContext";

import Head from "next/head";

const TargetGetter = dynamic(
  () => import("../components/TargetGetter"),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <Head>
        <title>Tools</title>
      </Head>
      <div className="main-container">

        <TargetProvider>
          <TargetGetter />
        </TargetProvider>

      </div>

    </>
  );
}


