# QSAR IN THE BROWSER (QITB)

### Why is QITB?
This project was borne out of a virtual screening campaign that was conducted for my MPhil thesis. I was given a biological target and told to explore AI/ML strategies to find agonists for it. I learned a ton and attended a lot of talks and conferences. There I met a man who after a very complex talk was like, do you have a UI for this where I could just press a button? And, from there this project was borne to strip all the programming and only keep the chemistry, with some options to dig into the complexities of various algorithms. 
For some, it will be a quick and dirty tool to analyze various targets and drugs to work on while for others it will be their foray into cheminformatics and analysis of small molecules. The hope is to make this website a powerful and versatile tool.

### Where is QITB?
Just in your browser. All the code runs in the browser. Using WASM and JS The technologies include:

- Next.js. Don't ask me why. I think it's for SEO. SSR with normal React is horrendous. SveltKit is in its infancy compared to React and I don't know how to use Vue. I have a penchant for headaches. That too!
- (RDKit JS)[https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib]. This is a custom build of the JS version with hopes for more contributions to the RDKit JS repo to import more functionalities into QITB. I need people with C++ knowledge to fix things.
- Pyodide and Scikit-Learn. 

### How is QITB?
You tell? Found an issue and want to fix it? Please feel free to make a PR. Will look forward to people turning and tossing my code to make it better.