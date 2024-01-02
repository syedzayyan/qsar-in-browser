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
        <title>SAR In Browser</title>
      </Head>
      <div className="main-container">

        <TargetProvider>
          <TargetGetter />
        </TargetProvider>

      </div>

    </>
  );
}


