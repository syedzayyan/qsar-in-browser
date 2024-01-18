import dynamic from "next/dynamic";
import { TargetProvider } from "../context/TargetContext";

import Head from "next/head";

const TargetGetter = dynamic(
  () => import("../components/TargetGetter"),
  { ssr: false }
);

export default function Page() {
  return (
    <>
      <Head>
        <title>QSAR In The Browser</title>
      </Head>
      <div className="main-container">

        <TargetProvider>
          <TargetGetter />
        </TargetProvider>

      </div>

    </>
  );
}


