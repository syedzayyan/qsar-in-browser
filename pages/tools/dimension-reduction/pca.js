import dynamic from 'next/dynamic';
import Head from 'next/head'

const PCAPlot = dynamic(
    () => import('../../../components/PCA_Plot'),
    { ssr: false }
);

export default function DataDistribution() {
    return (
        <div className='main-container'>
            <Head>
                <title>Data Distribution</title>
            </Head>
            <PCAPlot />
        </div>
    )
}