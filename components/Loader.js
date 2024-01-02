import Head from "next/head";

export default function Loader({ loadingText = 'Processsing'}){
    return(
        <div style={{textAlign:"center"}}>
            <Head>
                <title>{loadingText}</title>
            </Head>
            {loadingText}
            <div className="loader"></div>
        </div>
        
    )
}