# QSAR IN THE BROWSER (QITB)

<img src="https://github.com/syedzayyan/qsar-in-browser/blob/main/public/logo.svg" alt="image" width="300" width="300" height="auto">

### What is QITB?
QITB is “Quantitative structure-activity relationship (QSAR) in the browser”. For some, it will be a quick and dirty tool to analyze various targets and drugs. For others, it could be their first foray into cheminformatics and the analysis of small molecules. Our hope is to make this website a powerful and versatile tool.

### Why is QITB?
Quantitative structure-activity relationship (QSAR) analysis should be as accessible as possible, for academia, industry, students and anyone with a general interest in small molecules! QSAR in the browser (QITB) is our attempt (mainly through Syed Zayyan Masud’s efforts) to make QSAR accessible to all. 

### How was QITB made?
QITB was borne out of Syed Zayyan’s MPhil project at the University of Cambridge. The ultimate goal of this project was to explore whether machine learning could provide new drugs for an interesting drug target. (For those interested, it was the Adenosine A1 Receptor - one day, drugs targeting this might help treat people with chronic pain.) 

To this end, Syed learned how to represent molecules computationally and do various analyses and visualisations. Armed with these analytical QSAR approaches, Syed could assess the training data. This allowed assessment of various machine-learning models in the best context.

After learning a lot and attending many of talks and conferences, individuals showed interest in performing the same analysis for their own drug targets at the ‘press of a button’. By porting the code into, removing the need for technical understanding, keeping only the important chemistry and QSAR, QITB was born!

### Where can I access QITB?
Just in your browser. As a static web application using WASM and JS, all the code runs in the browser! Removing server maintenance costs allows QITB to be FREE! 

### The technologies behind QITB are:
- Next.js. 
	- _Mostly the routing is easier. I have tried Vanilla ReactJS and it's not easy to set up everything from scratch. I found SvelteJS routing to be weird and never understood how to work with SvelteKit and host it on Github Pages. _
- (https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib)[RDKit JS]. 
	- _This is a custom build of the JS version with hopes for more contributions to the RDKit MinimalLib to import more functionalities into QITB. I need people with C++ knowledge to fix things. I have started porting things though._
- Pyodide and Scikit-Learn. 
	- _What a gift to mankind._
- ChEMBL
	- Big thanks to ChEMBL for existing.

### How do you like QITB?
- If you found a problem, please let us know 
	- either by opening a new issue [here](https://github.com/syedzayyan/qsar-in-browser/issues/new). 
	- or emailing theobrn@live.co.uk
- If you’d like to fix something yourself, feel free to make a [pull request](https://github.com/syedzayyan/qsar-in-browser/pulls). 

### Who is behind QITB?
- Syed Zayyan Masud: Original developer and the brains behind the entire codebase.
- Professor Graham Ladds: Academic supervisor during the original MPhil project.
- Theo Redfern-Nichols: Mentor during MPhil, helps with design choices, UX changes etc. 