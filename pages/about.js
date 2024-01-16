import Head from "next/head";

export default function About() {
    return (
        <div className="main-container">
            <Head>
                <title>About</title>
            </Head>
            <div className="container" style = {{textAlign : 'left', width : '90%'}}>
                <h1>QSAR In The Browser</h1>
                <h3>Why is QITB?</h3>
                <p>This project was borne out of a virtual screening campaign that was conducted for my MPhil thesis. 
                    I was given a biological target and told to explore AI/ML strategies to find agonists for it. 
                    I learned a ton and attended a lot of talks and conferences. 
                    There I met a man who after a very complex talk was like, 
                    do you have a UI for this where I could just press a button? 
                    And, from there this project was borne to strip all the programming and only keep the chemistry, 
                    with some options to dig into the complexities of various algorithms. 
                    For some, it will be a quick and dirty tool to analyze various targets and drugs to work on while for others it will be their foray into cheminformatics and analysis of small molecules. 
                    The hope is to make this website a powerful and versatile tool.</p>
                <h3>Where is QITB?</h3>

                <p>Just in your browser. All the code runs in the browser. Using WASM and JS The technologies include:</p>
                <ul>
                    <li>Next.js. Don't ask me why. I think it's for SEO. SSR with normal React is horrendous. SveltKit is in its infancy compared to React and I don't know how to use Vue. I have a penchant for headaches. That too!</li>
                    <li><a href="https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib">(RDKit JS)</a>. This is a custom build of the JS version with hopes for more contributions to the RDKit JS repo to import more functionalities into QITB.</li>
                    <li>Pyodide and Scikit-Learn.</li>
                    <li>tSNE adapted for <a href="https://github.com/karpathy/tsnejs">Karpathy's</a> JavaScript implementation.</li>
                    <li>PCA from ml-pca</li>
                </ul>

                <h3>How is QITB?</h3>
                <p>You tell? Found an issue and want to fix it? Please feel free to make a PR. I am a noob when it comes to programming so will look forward to people turning and tossing my code to make it better.</p>
            </div>
        </div>

    )
}