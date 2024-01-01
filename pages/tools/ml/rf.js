import dynamic from 'next/dynamic';
import Head from 'next/head'
import TabbedComponent from '../../../components/Tabbed';

const RandomForest = dynamic(
    () => import('../../../components/RandomForest'),
    { ssr: false }
);

export default function ToolRF() {
    return (
        <div>
            <Head>
                <title>Random Forest</title>
            </Head>
            <TabbedComponent activeTab={3}/>
            <RandomForest />
        </div>
    )
}