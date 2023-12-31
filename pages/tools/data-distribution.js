import Head from 'next/head'
import dynamic from 'next/dynamic';

const Histogram = dynamic(
    () => import('../../components/Histogram'),
    { ssr: false }
);

export default function DataDistribution() {
    return (
        <div>
            <Head>
                <title>Data Distribution</title>
            </Head>
            <Histogram />
        </div>
    )
}