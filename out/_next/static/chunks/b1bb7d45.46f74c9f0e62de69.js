"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[723],{85337:function(e,t,s){s.d(t,{QV:function(){return LayersModel}});var i=s(15949),n=s(39840),a=s(28891),l=s(48090),r=s(40588),o=s(49897),h=s(73146),u=s(86275),p=s(38678),c=s(92328),f=s(38374),d=s(2931),g=s(30618),m=s(96040),y=s(51977),w=s(77385),b=s(26325),T=s(41111),v=s(28913),$=s(26347),z=s(86529);function isDataArray(e){return Array.isArray(e)}function isDataDict(e){return!(e instanceof i.esB)&&!isDataArray(e)}function standardizeInputData(e,t,s,i=!0,n=""){let a;if(null==t||0===t.length){if(null!=e){let t=!1;if(isDataArray(e)&&e.length>0)t=!0;else if(isDataDict(e)){for(let s in e)if(e.hasOwnProperty(s)){t=!0;break}}else t=!0;if(t)throw new r.nu(`Error when checking model ${n} expected no data, but got ${e}`)}return[]}if(null==e)return t.map(e=>null);if(isDataDict(e))for(let s of(a=[],t)){if(null==e[s])throw new r.nu(`No data provided for "${s}". Need data for each key in: ${t}`);a.push(e[s])}else if(isDataArray(e)){if(e.length!==t.length)throw new r.nu(`Error when checking model ${n}: the Array of Tensors that you are passing to your model is not the size the model expected. Expected to see ${t.length} Tensor(s), but instead got the following list of Tensor(s): ${e}`);a=e}else{if(t.length>1)throw new r.nu(`The model ${n} expects ${t.length} Tensor(s), but only received one Tensor. Found: Tensor with shape ${e.shape}`);a=[e]}if(a=(0,$.YV)(a),null!=s)for(let e=0;e<t.length;++e){if(null==s[e])continue;let l=a[e];if(l.shape.length!==s[e].length)throw new r.nu(`Error when checking ${n}: expected ${t[e]} to have ${s[e].length} dimension(s). but got array with shape ${l.shape}`);for(let t=0;t<s[e].length;++t){if(0===t&&!i)continue;let a=l.shape[t],o=s[e][t];if(null!=o&&o>=0&&a!==o)throw new r.nu(`${n} expected a batch of elements where each example has shape [${s[e].slice(1,s[e].length)}] (i.e.,tensor shape [*,${s[e].slice(1,s[e].length)}]) but the ${n} received an input with ${l.shape[0]} examples, each with shape [${l.shape.slice(1,l.shape.length)}] (tensor shape [${l.shape}])`)}}return a}function checkInputData(e,t,s,i=!0,n=""){let a;if(Array.isArray(e)){if(e.length!==t.length)throw new r.nu(`Error when checking model ${n}: the Array of Tensors that you are passing to your model is not the size the the model expected. Expected to see ${t.length} Tensor(s), but instead got ${e.length} Tensors(s).`);a=e}else{if(t.length>1)throw new r.nu(`The model expects ${t.length} ${n} Tensors, but only received one Tensor. Found: array with shape ${JSON.stringify(e.shape)}.`);a=[e]}if(null!=s)for(let e=0;e<t.length;++e){if(null==s[e])continue;let l=a[e];if(l.shape.length!==s[e].length)throw new r.nu(`Error when checking ${n}: expected ${t[e]} to have ${s[e].length} dimension(s), but got array with shape ${JSON.stringify(l.shape)}`);for(let a=0;a<s[e].length;++a){if(0===a&&!i)continue;let o=l.shape[a],h=s[e][a];if(null!=h&&h!==o)throw new r.nu(`Error when checking ${n}: expected ${t[e]} to have shape ${JSON.stringify(s[e])} but got array with shape ${JSON.stringify(l.shape)}.`)}}}let LayersModel=class LayersModel extends b.W{constructor(e){super(e),this.isTraining=!1}summary(e,t,s=console.log){if(!this.built)throw new r.nu("This model has never been called, thus its weights have not been created yet. So no summary can be displayed. Build the model first (e.g., by calling it on some test data).");(0,g.I)(this,e,t,s)}compile(e){if(null==e.loss&&(e.loss=[]),this.loss=e.loss,"string"==typeof e.optimizer)this.optimizer_=c.j(e.optimizer),this.isOptimizerOwned=!0;else{if(!(e.optimizer instanceof i.gaJ))throw new r.nu("User-defined optimizer must be an instance of tf.Optimizer.");this.optimizer_=e.optimizer,this.isOptimizerOwned=!1}let t=[];if(Array.isArray(e.loss)||"string"==typeof e.loss||"function"==typeof e.loss){if(Array.isArray(e.loss)){if(e.loss.length!==this.outputs.length)throw new r.nu(`When passing an Array as loss, it should have one entry per model output. The model has ${this.outputs.length} output(s), but you passed loss=${e.loss}.`);let s=e.loss;t=s.map(e=>u.U2(e))}else{let s=u.U2(e.loss);this.outputs.forEach(e=>{t.push(s)})}}else{for(let t in e.loss=e.loss,e.loss)if(-1===this.outputNames.indexOf(t))throw new r.nu(`Unknown entry in loss dictionary: "${t}". Only expected the following keys: ${this.outputNames}`);for(let s of this.outputNames)null==e.loss[s]&&console.warn(`Output "${s}" is missing from loss dictionary. We assume this was done on purpose, and we will not be expecting data to be passed to ${s} during training`),t.push(u.U2(e.loss[s]))}this.lossFunctions=t,this.feedOutputNames=[],this.feedOutputShapes=[],this.feedLossFns=[];for(let e=0;e<this.outputs.length;++e){let t=this.internalOutputShapes[e],s=this.outputNames[e];this.feedOutputNames.push(s),this.feedOutputShapes.push(t),this.feedLossFns.push(this.lossFunctions[e])}let s=[];this.metrics=e.metrics,this.metricsNames=["loss"],this.metricsTensors=[],(0,l.f4)("loss",()=>{for(let e=0;e<this.outputs.length;++e){if(-1!==s.indexOf(e))continue;let t=this.lossFunctions[e];this.outputs.length>1&&(this.metricsTensors.push([t,e]),this.metricsNames.push(this.outputNames[e]+"_loss"))}});let n=function(e,t){let s;if(null==e||Array.isArray(e)&&0===e.length)return t.map(e=>[]);if("string"==typeof e||"function"==typeof e)s=[e];else if(Array.isArray(e)||"object"==typeof e)s=e;else throw TypeError(`Type of metrics argument not understood. Expected an string,function, Array, or Object, found: ${e}`);if(Array.isArray(s))return t.map(e=>s);{let e=[];for(let i of t){let t=s.hasOwnProperty(i)?s[i]:[];Array.isArray(t)||(t=[t]),e.push(t)}return e}}(e.metrics,this.outputNames),appendMetric=(e,t,s)=>{this.outputNames.length>1&&(t=this.outputNames[e]+"_"+t),this.metricsNames.push(t),this.metricsTensors.push([s,e])};(0,l.f4)("metric",()=>{for(let e=0;e<this.outputs.length;++e){if(-1!==s.indexOf(e))continue;let t=n[e],handleMetrics=t=>{let s,i,n;for(let a of t){let t;if("string"==typeof a&&-1!==["accuracy","acc","crossentropy","ce"].indexOf(a)){let t;let l=this.internalOutputShapes[e];1===l[l.length-1]||this.lossFunctions[e]===u.fO?-1!==["accuracy","acc"].indexOf(a)?i=p._F:-1!==["crossentropy","ce"].indexOf(a)&&(i=p.fO):this.lossFunctions[e]===u.KM?-1!==["accuracy","acc"].indexOf(a)?i=p.TY:-1!==["crossentropy","ce"].indexOf(a)&&(i=p.KM):-1!==["accuracy","acc"].indexOf(a)?i=p.G5:-1!==["crossentropy","ce"].indexOf(a)&&(i=p.uq),-1!==["accuracy","acc"].indexOf(a)?t="acc":-1!==["crossentropy","ce"].indexOf(a)&&(t="ce"),n=i,s=""+t}else{let e=p.U2(a);n=e,s=""+p.aI(a)}(0,l.f4)(s,()=>{t=n}),appendMetric(e,s,t)}};handleMetrics(t)}}),this.collectedTrainableWeights=this.trainableWeights}checkTrainableWeightsConsistency(){null!=this.collectedTrainableWeights&&this.trainableWeights.length!==this.collectedTrainableWeights.length&&console.warn("Discrepancy between trainableweights and collected trainable weights. Did you set `model.trainable` without calling `model.compile()` afterwards?")}evaluate(e,t,s={}){let i=null==s.batchSize?32:s.batchSize;(0,$.fQ)(i);let n=this.standardizeUserDataXY(e,t,!0,i);try{let e=n[0].concat(n[1]);this.makeTestFunction();let t=this.testFunction,a=this.testLoop(t,e,i,s.verbose,s.steps);return(0,d.Bq)(a)}finally{(0,$.kS)(n[0],e),(0,$.kS)(n[1],t)}}async evaluateDataset(e,t){return this.makeTestFunction(),(0,v.D)(this,e,t)}checkNumSamples(e,t,s,i="steps"){let n;if(null!=s){if(n=null,null!=t)throw new r.nu(`If ${i} is set, batchSize must be null or undefined.Got batchSize = ${t}`)}else if(null!=e)n=Array.isArray(e)?e[0].shape[0]:e.shape[0];else throw new r.nu(`Either the input data should have a defined shape, or ${i} shoud be specified.`);return n}execute(e,t){if(Array.isArray(t)&&0===t.length)throw new r.nu("`outputs` is an empty Array, which is not allowed.");let s=Array.isArray(t),n=s?t:[t],a=this.retrieveSymbolicTensors(n),l=new T.l2;if(e instanceof i.esB&&(e=[e]),Array.isArray(e)){if(e.length!==this.inputs.length)throw new r.nu(`The number of inputs provided (${e.length}) does not match the number of inputs of this model (${this.inputs.length}).`);for(let t=0;t<this.inputs.length;++t)l.add(this.inputs[t],e[t])}else for(let t of this.inputs){let s=e[t.name];if(null==s)throw new r.nu(`No value is provided for the model's input ${t.name}`);l.add(t,s)}let o=(0,T.ht)(a,l);return s?o:o[0]}retrieveSymbolicTensors(e){let t=(0,d.JE)(null,e.length),s=e.length;for(let i of this.layers){let n=Array.isArray(i.output)?i.output:[i.output],a=n.map(e=>e.name);for(let i=0;i<e.length;++i){let l=a.indexOf(e[i]);if(-1!==l&&(t[i]=n[l],s--),0===s)break}if(0===s)break}if(s>0){let s=[];throw t.forEach((t,i)=>{null==t&&s.push(e[i])}),new r.nu(`Cannot find SymbolicTensors for output name(s): ${JSON.stringify(s)}`)}return t}predictLoop(e,t=32,s=!1){return i.lub(()=>{let n=this.checkNumSamples(e);if(s)throw new r.nj("Verbose predictLoop() is not implemented yet.");let a=(0,$.R_)(n,t),l=this.outputs.map(e=>[]);for(let t=0;t<a.length;++t){let s=i.lub(()=>{let s=a[t][0],i=a[t][1],n=(0,$.sf)(e,s,i),l=[];if(Array.isArray(n))for(let e=0;e<n.length;++e)l.push({key:this.inputs[e],value:n[e]});else l.push({key:this.inputs[0],value:n});let r=new T.l2(l);return(0,T.ht)(this.outputs,r)});s.forEach((e,t)=>l[t].push(e))}return(0,d.Bq)(l.map(e=>i.zoF(e,0)))})}predict(e,t={}){let s=(0,$.YV)(e);checkInputData(s,this.inputNames,this.feedInputShapes,!1);try{let e=null==t.batchSize?32:t.batchSize;return(0,$.fQ)(e),this.predictLoop(s,e)}finally{(0,$.kS)(s,e)}}predictOnBatch(e){checkInputData(e,this.inputNames,this.feedInputShapes,!0);let t=(Array.isArray(e)?e[0]:e).shape[0];return this.predictLoop(e,t)}standardizeUserDataXY(e,t,s=!0,n){if(null==this.optimizer_)throw new r.LH("You must compile a model before training/testing. Use LayersModel.compile(modelCompileArgs).");let a=[];for(let e=0;e<this.feedOutputShapes.length;++e){let t=this.feedOutputShapes[e],s=this.feedLossFns[e];s===u.KM?a.push(t.slice(0,t.length-1).concat([1])):a.push(t)}if(e=standardizeInputData(e,this.feedInputNames,this.feedInputShapes,!1,"input"),t=standardizeInputData(t,this.feedOutputNames,a,!1,"target"),!function(e,t,s){let n=(0,d.Tw)(e.map(e=>e.shape[0]));n.sort();let a=(0,d.Tw)(t.map(e=>e.shape[0]));if(a.sort(),n.length>1)throw new r.nu(`All input Tensors (x) should have the same number of samples. Got array shapes: ${JSON.stringify(e.map(e=>e.shape))}`);if(a.length>1)throw new r.nu(`All target Tensors (y) should have the same number of samples. Got array shapes: ${JSON.stringify(t.map(e=>e.shape))}`);if(n.length>0&&a.length>0&&!i.D5U.arraysEqual(n,a))throw new r.nu(`Input Tensors should have the same number of samples as target Tensors. Found ${n[0]} input sample(s) and ${a[0]} target sample(s).`)}(e,t,0),!function(e,t,s){let i=[u.FD,u.fO,u.uq];for(let n=0;n<e.length;++n){let a=e[n],l=t[n],o=s[n];if(null!=l){if(l===u.uq&&1===a.shape[a.shape.length-1])throw new r.nu(`You are passing a target array of shape ${a.shape} while using a loss 'categorical_crossentropy'. 'categorical_crossentropy'expects targets to be binary matrices (1s and 0s) of shape [samples, classes].`);if(-1!==i.indexOf(l)){let e=a.shape.slice(1),t=o.slice(1);for(let s=0;s<e.length;++s){let i=e[s],n=t[s];if(null!=n&&i!==n)throw new r.nu(`A target Tensor with shape ${a.shape} was passed for an output of shape ${o}, while using a loss function that expects targets to have the same shape as the output.`)}}}}}(t,this.feedLossFns,this.feedOutputShapes),this.stateful&&null!=n&&n>0&&e[0].shape[0]%n!=0)throw new r.nu(`In a stateful network, you should only pass inputs with a number of samples that is divisible by the batch size ${n}. Found: ${e[0].shape[0]} sample(s).`);return[e,t]}async standardizeUserData(e,t,s,i,n=!0,a){let[l,r]=this.standardizeUserDataXY(e,t,n,a);if(null!=s)throw Error("sample weight is not supported yet.");let o=null;if(null!=i){let e=(0,z.Vf)(i,this.outputNames);o=[];for(let t=0;t<e.length;++t)o.push(await (0,z.tl)(r[t],null,e[t]))}return[l,r,o]}testLoop(e,t,s,a=0,l){return i.lub(()=>{let o=this.checkNumSamples(t,s,l,"steps"),h=[];if(a>0)throw new r.nj("Verbose mode is not implemented yet.");if(null!=l)throw new r.nj("steps mode in testLoop() is not implemented yet");{let a=(0,$.R_)(o,s),l=(0,i.RRF)((0,m.w6)(0,o));for(let s=0;s<a.length;++s){let r=a[s][0],o=a[s][1],u=n.c9(l,r,o-r),p=(0,$.YX)(t,u),c=e(p);if(0===s)for(let e=0;e<c.length;++e)h.push((0,i.iD$)(0));for(let e=0;e<c.length;++e){let t=c[e];h[e]=i.IHx(h[e],i.dC7(o-r,t))}}for(let e=0;e<h.length;++e)h[e]=i.hiC(h[e],o)}return h})}getDedupedMetricsNames(){let e=this.metricsNames,t=[];for(let s=0;s<e.length;++s){let i=e[s],n=i;if((0,d.QX)(e,i)>1){let t=(0,d.QX)(e.slice(0,s),i);n+=`_${t}`}t.push(n)}return t}makeTrainFunction(){return e=>{let t=[],s=e.slice(0,this.inputs.length),n=e.slice(this.inputs.length,this.inputs.length+this.outputs.length),a=e.slice(this.inputs.length+this.outputs.length,this.inputs.length+2*this.outputs.length),l=[],r=this.collectedTrainableWeights.map(e=>e.read()),o=this.optimizer_.minimize(()=>{let e;let r=[];for(let e=0;e<this.inputs.length;++e)r.push({key:this.inputs[e],value:s[e]});let o=new T.l2(r),h=(0,T.ht)(this.outputs,o,{training:!0});for(let s=0;s<this.lossFunctions.length;++s){let l=this.lossFunctions[s],r=l(n[s],h[s]);null!=a[s]&&(r=(0,z.mo)(r,a[s]));let o=i.J69(r);t.push(o),e=0===s?r:i.IHx(e,r)}for(let e=0;e<this.metricsTensors.length;++e){let s;if(this.outputs.length>1&&e<this.outputs.length)s=t[e];else{let t=this.metricsTensors[e][0],a=this.metricsTensors[e][1];s=i.J69(t(n[a],h[a]))}i.CnY(s),l.push(s)}return e=i.J69(e),this.calculateLosses().forEach(t=>{e=i.IHx(e,t)}),e},!0,r);return[o].concat(l)}}makeTestFunction(){this.testFunction=e=>i.lub(()=>{let t;let s=[],n=e.slice(0,this.inputs.length),a=e.slice(this.inputs.length,this.inputs.length+this.outputs.length),l=[];for(let e=0;e<this.inputs.length;++e)l.push({key:this.inputs[e],value:n[e]});let r=new T.l2(l),o=(0,T.ht)(this.outputs,r);for(let e=0;e<this.lossFunctions.length;++e){let n=this.lossFunctions[e],l=i.J69(n(a[e],o[e]));t=0===e?l:i.IHx(t,l),s.push(t)}for(let e=0;e<this.metricsTensors.length;++e){let t=this.metricsTensors[e][0],n=this.metricsTensors[e][1],l=i.J69(t(a[n],o[n]));s.push(l)}return s})}async fit(e,t,s={}){let n,l,o,h,u,p,c,f,d;if(this.isTraining)throw Error("Cannot start training because another fit() call is ongoing.");this.isTraining=!0;try{let i,g,m;let y=null==s.batchSize?32:s.batchSize;(0,$.fQ)(y);let w=await this.standardizeUserData(e,t,s.sampleWeight,s.classWeight,!1,y);n=w[0],l=w[1],d=w[2];let b=!1;if(null!=s.validationData&&s.validationData.length>0){if(b=!0,2===s.validationData.length)u=s.validationData[0],p=s.validationData[1];else if(3===s.validationData.length)throw new r.nj("validationData including sample weights is not supported yet.");else throw new r.nu(`When passing validation data, it must contain 2 (valX, valY) or 3 (valX, valY, valSampleWeight) items; ${s.validationData} is invalid.`);let e=await this.standardizeUserData(u,p,null,null,!0,y);c=e[0],f=e[1],i=c.concat(f)}else if(null!=s.validationSplit&&s.validationSplit>0&&s.validationSplit<1){b=!0;let e=Math.floor(n[0].shape[0]*(1-s.validationSplit)),t=n[0].shape[0];c=(0,$.sf)(n,e,t),o=n,n=(0,$.sf)(n,0,e),f=(0,$.sf)(l,e,t),h=l,l=(0,$.sf)(l,0,e),i=c.concat(f)}else null!=s.validationSteps&&(b=!0);let T=n.concat(l).concat(d);this.checkTrainableWeightsConsistency();let v=this.makeTrainFunction(),z=this.getDedupedMetricsNames();b?(this.makeTestFunction(),g=this.testFunction,m=z.slice().concat(z.map(e=>"val_"+e))):(g=null,i=[],m=z.slice());let D=(0,a.CZ)(s.callbacks,s.yieldEvery),S=await this.fitLoop(v,T,z,y,s.epochs,s.verbose,D,g,i,s.shuffle,m,s.initialEpoch,null,null);return S}finally{this.isTraining=!1,(0,$.kS)(n,e),(0,$.kS)(l,t),(0,$.kS)(o,e),(0,$.kS)(h,t),(0,$.kS)(c,u),(0,$.kS)(f,p),null!=d&&i.B90(d)}}async fitLoop(e,t,s,l,o,u,p,c,f,d,g,y,w,b){let T;null==l&&(l=32),null==o&&(o=1),null==d&&(d=!0),null==y&&(y=0);let v=!1;if(null!=c&&null!=f&&(v=!0),null!=b&&(v=!0,null==w))throw new r.nu("Can only use `validationSteps` when doing step-wise training, i.e., `stepsPerEpoch` must be set.");let z=this.checkNumSamples(t,l,w,"steps_per_epoch");null!=z&&(T=(0,m.w6)(0,z)),null==u&&(u=1);let{callbackList:D,history:S}=(0,a.m$)(p,u,o,y,z,w,l,v,g);D.setModel(this),this.history=S,await D.onTrainBegin(),this.stopTraining_=!1;for(let a=y;a<o;++a){await D.onEpochBegin(a);let o={};if(null!=w)throw new r.nj("stepsPerEpoch mode is not implemented yet.");{if("batch"===d)throw new r.nj("batch shuffling is not implemneted yet");d&&i.D5U.shuffle(T);let a=(0,i.RRF)(T),u=(0,$.R_)(z,l);for(let r=0;r<u.length;++r){let p={};if(await D.onBatchBegin(r,p),i.lub(()=>{let h=u[r][0],d=u[r][1],g=n.c9(a,h,d-h);p.batch=r,p.size=d-h;let m=(0,$.YX)(t,g),y=e(m);for(let e=0;e<s.length;++e){let t=s[e],n=y[e];p[t]=n,i.CnY(n)}if(r===u.length-1&&v){let e=this.testLoop(c,f,l);for(let t=0;t<s.length;++t){let n=s[t],a=e[t];i.CnY(a),o["val_"+n]=a}}}),await D.onBatchEnd(r,p),(0,h.i)(p),this.stopTraining_)break}a.dispose()}if(await D.onEpochEnd(a,o),this.stopTraining_)break}return await D.onTrainEnd(),await this.history.syncData(),this.history}async fitDataset(e,t){return(0,v.y)(this,e,t)}async trainOnBatch(e,t){let s=await this.standardizeUserData(e,t),n=s[0],a=s[1],l=this.makeTrainFunction(),r=l(n.concat(a)),o=[];for(let e of r){let t=await e.data();o.push(t[0])}return i.B90(r),(0,$.kS)(s[0],e),(0,$.kS)(s[1],t),(0,d.Bq)(o)}getNamedWeights(e){let t=[],s=null!=e&&e.trainableOnly,i=s?this.trainableWeights:this.weights,n=this.getWeights(s);for(let e=0;e<i.length;++e)(!s||i[e].trainable)&&t.push({name:i[e].originalName,tensor:n[e]});return t}set stopTraining(e){this.stopTraining_=e}get stopTraining(){return this.stopTraining_}get optimizer(){return this.optimizer_}set optimizer(e){this.optimizer_!==e&&(this.optimizer_=e,this.isOptimizerOwned=!1)}dispose(){let e=super.dispose();if(0===e.refCountAfterDispose&&null!=this.optimizer&&this.isOptimizerOwned){let t=i.sq6().numTensors;this.optimizer_.dispose(),e.numDisposedVariables+=t-i.sq6().numTensors}return e}getLossIdentifiers(){let e;if("string"==typeof this.loss)e=(0,d.D1)(this.loss);else if(Array.isArray(this.loss)){for(let e of this.loss)if("string"!=typeof e)throw Error("Serialization of non-string loss is not supported.");e=this.loss.map(e=>(0,d.D1)(e))}else{let t=Object.keys(this.loss);e={};let s=this.loss;for(let i of t)if("string"==typeof s[i])e[i]=(0,d.D1)(s[i]);else throw Error("Serialization of non-string loss is not supported.")}return e}getMetricIdentifiers(){if("string"==typeof this.metrics||"function"==typeof this.metrics)return[(0,d.D1)(p.aI(this.metrics))];if(Array.isArray(this.metrics))return this.metrics.map(e=>(0,d.D1)(p.aI(e)));{let e={};for(let t in this.metrics)e[t]=(0,d.D1)(p.aI(this.metrics[t]));return e}}getTrainingConfig(){return{loss:this.getLossIdentifiers(),metrics:this.getMetricIdentifiers(),optimizer_config:{class_name:this.optimizer.getClassName(),config:this.optimizer.getConfig()}}}loadTrainingConfig(e){let t,s;if(null!=e.weighted_metrics)throw Error("Loading weight_metrics is not supported yet.");if(null!=e.loss_weights)throw Error("Loading loss_weights is not supported yet.");if(null!=e.sample_weight_mode)throw Error("Loading sample_weight_mode is not supported yet.");let i=(0,y.a)(e.optimizer_config),n=(0,o.v)(i);if("string"==typeof e.loss)t=(0,d.zW)(e.loss);else if(Array.isArray(e.loss))t=e.loss.map(e=>(0,d.zW)(e));else if(null!=e.loss)for(let s in t={},e.loss)t[s]=(0,d.zW)(e.loss[s]);if(Array.isArray(e.metrics))s=e.metrics.map(e=>(0,d.zW)(e));else if(null!=e.metrics)for(let t in s={},e.metrics)s[t]=(0,d.zW)(e.metrics[t]);this.compile({loss:t,metrics:s,optimizer:n})}async save(e,t){if("string"==typeof e){let t=i.io.getSaveHandlers(e);if(0===t.length)throw new r.nu(`Cannot find any save handlers for URL '${e}'`);if(t.length>1)throw new r.nu(`Found more than one (${t.length}) save handlers for URL '${e}'`);e=t[0]}if(null==e.save)throw new r.nu("LayersModel.save() cannot proceed because the IOHandler provided does not have the `save` attribute defined.");let s=await i.io.encodeWeights(this.getNamedWeights(t)),n=this.toJSON(null,!1),a={modelTopology:n,format:"layers-model",generatedBy:`TensorFlow.js tfjs-layers v${w.i}`,convertedBy:null},l=null!=t&&t.includeOptimizer;if(l&&null!=this.optimizer){a.trainingConfig=this.getTrainingConfig();let{data:e,specs:t}=await i.io.encodeWeights(await this.optimizer.getWeights(),"optimizer");s.specs.push(...t),s.data=i.io.concatenateArrayBuffers([s.data,e])}return null!=this.userDefinedMetadata&&((0,f.WE)(this.userDefinedMetadata,this.name,!0),a.userDefinedMetadata=this.userDefinedMetadata),a.weightData=s.data,a.weightSpecs=s.specs,e.save(a)}setUserDefinedMetadata(e){(0,f.WE)(e,this.name),this.userDefinedMetadata=e}getUserDefinedMetadata(){return this.userDefinedMetadata}};LayersModel.className="Model",i.m7h.registerClass(LayersModel);let Functional=class Functional extends LayersModel{};Functional.className="Functional",i.m7h.registerClass(Functional)}}]);