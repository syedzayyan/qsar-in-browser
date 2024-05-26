# QSAR IN THE BROWSER (QITB)

<img src="https://github.com/syedzayyan/qsar-in-browser/blob/main/public/logo.svg" alt="image" width="300" width="300" height="auto">

### Why is QITB?
This project was borne out of a virtual screening campaign that was conducted for my MPhil thesis. I was given a biological target and told to explore AI/ML strategies to find agonists for it. I learned a ton and attended a lot of talks and conferences. There I met a man who after a very complex talk was like, do you have a UI for this where I could just press a button? And, from there this project was borne to strip all the programming and only keep the chemistry, with some options to dig into the complexities of various algorithms. 
For some, it will be a quick and dirty tool to analyze various targets and drugs to work on while for others it will be their foray into cheminformatics and analysis of small molecules. The hope is to make this website a powerful and versatile tool.

### Where is QITB?
Just in your browser. All the code runs in the browser. Using WASM and JS. The technologies include:

- Next.js. Mostly the routing is easier. I have tried Vanilla ReactJS and it's not easy to set up everything from scratch. SvelteJS routing is weird, I never understood how to work with SvelteKit and host it on Github Pages. Part of the reason why QITB remains FREE forever is it is a static website.
- (https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib)[RDKit JS]. This is a custom build of the JS version with hopes for more contributions to the RDKit MinimalLib to import more functionalities into QITB. I need people with C++ knowledge to fix things. I have started porting things though.
- Pyodide and Scikit-Learn. What a gift to mankind.
- Big thanks to ChEMBL for existing.

### How is QITB?
You tell? Found an issue and want to fix it? Please feel free to make a PR. Will look forward to people turning and tossing my code to make it better.

### How to make QITB better?



### Who is behind QITB and What Do They Do?
- Me (Syed Zayyan Masud): Horrible, uncommented, untestable code.
- Theo Redfern-Nichols: Making the UI Useable and Combing through my bad Design Choices and coming up with VERY useful Suggestions.
- Professor Graham Ladds: For believing that I could do an MPhil and continue to let me work on QITB