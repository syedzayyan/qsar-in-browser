import '../styles/index.css';
import { LigandProvider } from '../context/LigandContext'
import Navbar from '../components/Navbar'

function MyApp({ Component, pageProps }) {


  return (
    <LigandProvider>
        <Navbar />
        <Component {...pageProps} />
    </LigandProvider>
  );
}

export default MyApp;
