import Head from 'next/head'
import dynamic from 'next/dynamic';
import TabbedComponent from '../../../components/Tabbed';

const MMA = dynamic(
    () => import('../../../components/MMA'),
    { ssr: false }
);

export default function DataDistribution() {
    return (
        <div>
            <Head>
                <title>Matched Molecular Series Analysis</title>
            </Head>
            <TabbedComponent activeTab={3}/>
            <MMA />
        </div>
    )
}