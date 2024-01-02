import '../styles/index.css';
import { LigandProvider } from '../context/LigandContext'
import Navbar from '../components/Navbar'
import Head from 'next/head';

function MyApp({ Component, pageProps }) {


  return (
    <>
      <Head>
      <link rel="shortcut icon" href="favicon.ico" />        
      </Head>

    <LigandProvider>
        <Navbar />
        <Component {...pageProps} />
    </LigandProvider>
    </>
  );
}

export default MyApp;
