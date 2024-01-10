import '../styles/index.css';
import { LigandProvider } from '../context/LigandContext'
import Navbar from '../components/Navbar'
import Head from 'next/head';
import Script from 'next/script';
import 'react-tabs/style/react-tabs.css';

function MyApp({ Component, pageProps }) {

  function lemonLoaded() {
    console.log(window.createLemonSqueezyCheckout)
  }

  return (
    <>
      <Head>
      <link rel="shortcut icon" href="favicon.ico" />  

      <Script
        src="https://app.lemonsqueezy.com/js/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {
          lemonLoaded();
        }}
      />

      </Head>

    <LigandProvider>
        <Navbar />
        <Component {...pageProps} />
    </LigandProvider>
    </>
  );
}

export default MyApp;
