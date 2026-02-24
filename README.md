# QSAR IN THE BROWSER (QITB)

<img src="https://github.com/syedzayyan/qsar-in-browser/blob/main/public/logo.svg" alt="image" width="300" width="300" height="auto">

### What is QITB?
Quantitative structure-activity relationship (QSAR) in the browser (QITB) is a browser-based platform for analysing small molecule data. It is designed to make cheminformatic techniques accessible to a wider range of researchers, scientists and analysts. We believe QSAR analysis should be as accessible as possible, for academia, industry, students and anyone with a general interest in small molecules! QSAR in the browser (QITB) is our attempt to make QSAR accessible to all. 

For some, it may work well as a rough tool before more intense analysis later. For others, it may be their first experience of cheminformatics and analysis of big data with small molecules. Our hope is to make this website a simple, powerful and versatile tool.

### How was QITB made?
QITB is primarily developed by Syed Zayyan, with help from Professor Graham Ladds and Dr Theo Redfern-Nichols. After studying an MPhil project in Graham's lab at the University of Cambridge, Syed learned many basic cheminformatic techniques - to better understand the underlying data for an ambitious machine-learning, drug development project. These techniques and resulting visualisations are simple relative to the complexity world of cheminformatics. Most importantly however, they are generalisable to any group of small molecules. 

Collating together these generalisable cheminformatic approaches together with a hopefully simple user-interface, QITB was born!

### Is QITB private and secure?
Entirely! As a static web application using WASM and JS, all code runs in the browser! Any data you provide stays on your machine. Additionally, removing server maintenance costs allows QITB to be FREE! 

### Key technologies behind QITB
- **Next.js** _A React-based framework that simplifies routing and backend integration. Compared to vanilla ReactJS, Next.js offers a more streamlined setup, reducing the complexity of configuring everything from scratch. (SvelteKit was experimented with in early stages but the routing system felt less intuitive)._ 
- RDKit JS. 
	-  _A custom build of the JavaScript adaptation of the [RDKit](https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib) library, a powerful toolkit for cheminformatics. With more and more contributions to RDKit MinimalLib, more features will be imported to work within QITB. Currently Syed Zayyan is working on porting additional features, but C++ expertise is needed to refine the underlying code._  
- Pyodide and Scikit-Learn. 
	- Essential for running Python-based machine learning directly in the browser. Pyodide enables seamless integration of Scikit-Learn (a leading Python library for data science) without requiring server-side processing - a true innovation for web applications. 
- ChEMBL
	- A critical resource for accessing large amounts of high-quality small molecule data. The EMBL's work on the ChEMBL database is instrumental to QITB's functionality when users don't have their own data. 

### Report a Problem or Request a Feature
- If you found a problem, please let us know 
	- either by opening a new issue [here](https://github.com/syedzayyan/qsar-in-browser/issues/new). 
	- or emailing theobrn@live.co.uk
- If you’d like to fix something yourself, feel free to make a [pull request](https://github.com/syedzayyan/qsar-in-browser/pulls). 
- If you love QITB, but would like to see a feature added, let us know [here](https://github.com/syedzayyan/qsar-in-browser/issues/new).

### Who is behind QITB?
- Syed Zayyan Masud: Original developer and the brains behind the entire codebase.
- Professor Graham Ladds: Academic supervisor during original MPhil project at University of Cambridge.
- Dr Theo Redfern-Nichols: Mentor during MPhil project, improved design, user-experience and explanations of techniques. 