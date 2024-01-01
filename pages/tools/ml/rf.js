import dynamic from 'next/dynamic';
import Head from 'next/head'
import TabbedComponent from '../../../components/Tabbed';

const PCAPlot = dynamic(
    () => import('../../../components/PCA_Plot'),
    { ssr: false }
);

export default function DataDistribution() {
    return (
        <div>
            <Head>
                <title>Data Distribution</title>
            </Head>
            <TabbedComponent activeTab={1}/>
            <PCAPlot />
        </div>
    )
}