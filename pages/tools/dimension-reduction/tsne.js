import dynamic from 'next/dynamic';
import Head from 'next/head'
import TabbedComponent from '../../../components/Tabbed';

const TSNEPlot = dynamic(
    () => import('../../../components/tSNE_Plot'),
    { ssr: false }
);

export default function DataDistribution() {
    return (
        <div>
            <Head>
                <title>Data Distribution</title>
            </Head>
            <TabbedComponent activeTab={2}/>
            <TSNEPlot />
        </div>
    )
}