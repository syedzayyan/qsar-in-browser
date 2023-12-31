import dynamic from 'next/dynamic';
import Head from 'next/head'

const FPGen = dynamic(
    () => import('../../../components/PCA_Plot'),
    { ssr: false }
);

export default function DataDistribution() {
    return (
        <div>
            <Head>
                <title>Data Distribution</title>
            </Head>
            <FPGen />
        </div>
    )
}