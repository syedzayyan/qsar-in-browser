(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[847],{5042:function(){},3364:function(t,e,n){Promise.resolve().then(n.bind(n,303))},303:function(t,e,n){"use strict";n.r(e),n.d(e,{default:function(){return Tanimoto}});var r=n(7437),i=n(2265),a=n(4938),o=n(3149),l=n(52),s=n(4469),u=n(3513);function TanimotoSimilarity(t,e){let n=u.AKD(t,e);if(0===n)return 0;let r=u.Rxh(u.h62(u.KOy(t,2)))+u.Rxh(u.h62(u.KOy(e,2)))-n;return 0==r?0:n/r}function Tanimoto(){let{ligand:t}=(0,i.useContext)(a.Z),{rdkit:e}=(0,i.useContext)(l.Z),n=(0,i.useRef)(null),[u,c]=(0,i.useState)({width:0,height:0}),[d,h]=(0,i.useState)([]),[f,m]=(0,i.useState)("CCO");return(0,i.useEffect)(()=>{let handleResize=()=>{let t=n.current.getBoundingClientRect();c({width:t.width,height:t.height})};return handleResize(),window.addEventListener("resize",handleResize),()=>{window.removeEventListener("resize",handleResize)}},[]),(0,r.jsxs)("div",{className:"tools-container",ref:n,children:[(0,r.jsx)("input",{defaultValue:f,type:"text",className:"input",onChange:t=>m(t.target.value)}),(0,r.jsx)("button",{className:"button",onClick:function(){console.log(TanimotoSimilarity([0,0,1],[0,0,1]));let n=e.get_mol(f),r=(0,s.Z)(n.get_morgan_fp(JSON.stringify({radius:2,nBits:2048}))),i=t.map(t=>{let e=TanimotoSimilarity(t.fingerprint,r);return e});h(i)},children:"Generate Graph"}),0!=d.length&&(0,r.jsx)(r.Fragment,{children:(0,r.jsx)(o.Z,{data:d,width:u.width,height:u.height,xLabel:"Tanimoto Scores",yLabel:"Count"})})]})}},3149:function(t,e,n){"use strict";n.d(e,{Z:function(){return Histogram}});var r=n(7437),i=n(2265),a=n(879);let o={top:30,right:30,bottom:40,left:50};function Histogram(t){let{data:e,width:n,height:l,xLabel:s="",yLabel:u=""}=t,c=(0,i.useRef)(null),d=n-100-o.right-o.left,h=l-o.top-o.bottom,f=(0,i.useMemo)(()=>{let t=Math.max(...e),n=Math.min(...e);return a.BYU().domain([n,t]).range([0,d])},[e,d]),m=(0,i.useMemo)(()=>a.Ly_().value(t=>t).domain(f.domain()).thresholds(f.ticks(70)),[f]),g=(0,i.useMemo)(()=>m(e),[m,e]),x=(0,i.useMemo)(()=>{let t=a.Fp7(g,t=>t.length);return a.BYU().range([h,0]).domain([0,t||0]).nice()},[g,h]);return(0,i.useEffect)(()=>{let t=a.Ys(c.current);t.selectAll("*").remove();let e=a.LLu(f);t.append("g").attr("transform","translate(".concat(o.left,",").concat(l-o.bottom,")")).call(e),t.append("text").attr("transform","translate(".concat(n/2,",").concat(l-o.bottom+30,")")).style("text-anchor","middle").text(s);let r=a.y4O(x);t.append("g").attr("transform","translate(".concat(o.left,",").concat(o.top,")")).call(r),t.append("text").attr("transform","rotate(-90)").attr("y",o.left-40).attr("x",0-l/2).attr("dy","1em").style("text-anchor","middle").text(u),t.append("g").attr("transform","translate(".concat(o.left,",").concat(o.top,")")).selectAll("rect").data(g).join("rect").attr("x",t=>f(t.x0)+.5).attr("width",t=>Math.max(0,f(t.x1)-f(t.x0)-1)).attr("y",t=>x(t.length)).attr("height",t=>h-x(t.length)).attr("fill","#69b3a2")},[f,x,g]),(0,r.jsx)("div",{className:"container",children:(0,r.jsx)("svg",{width:n,height:l,ref:c,children:(0,r.jsx)("g",{ref:c})})})}},4469:function(t,e,n){"use strict";function bitStringToBitVector(t){let e=[];for(let n=0;n<t.length;n++)e.push(parseFloat(t[n]));return e}n.d(e,{Z:function(){return bitStringToBitVector}})},4938:function(t,e,n){"use strict";n.d(e,{G:function(){return LigandProvider}});var r=n(7437),i=n(2265);let a=(0,i.createContext)({ligand:[],setLigand:()=>{}});function LigandProvider(t){let{children:e}=t,[n,o]=(0,i.useState)([]);return(0,r.jsx)(a.Provider,{value:{ligand:n,setLigand:o},children:e})}e.Z=a},52:function(t,e,n){"use strict";n.d(e,{o:function(){return RDKitProvider}});var r=n(7437),i=n(2265);let a=(0,i.createContext)({rdkit:{},setRDKit:()=>{}});function RDKitProvider(t){let{children:e}=t,[n,o]=(0,i.useState)({});return(0,r.jsx)(a.Provider,{value:{rdkit:n,setRDKit:o},children:e})}e.Z=a}},function(t){t.O(0,[291,513,971,864,744],function(){return t(t.s=3364)}),_N_E=t.O()}]);