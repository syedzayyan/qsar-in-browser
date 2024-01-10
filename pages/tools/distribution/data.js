import Head from 'next/head'
import dynamic from 'next/dynamic';
import TabbedComponent from '../../../components/Tabbed';

const Histogram = dynamic(
    () => import('../../../components/Histogram'),
    { ssr: false }
);

export default function DataDistribution() {
    return (
        <div>
            <Head>
                <title>Data Distribution</title>
            </Head>
            <TabbedComponent activeTab={0}/>
            <Histogram />
        </div>
    )
}