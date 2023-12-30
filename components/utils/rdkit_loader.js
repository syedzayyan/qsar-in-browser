import _ from "lodash";
import initRDKitModule from "@rdkit/rdkit";


export const initRDKit = (() => {
    let rdkitLoadingPromise;
  
    return () => {
      if (!rdkitLoadingPromise) {
        rdkitLoadingPromise = new Promise((resolve, reject) => {
          initRDKitModule()
            .then((RDKit) => {
              resolve(RDKit);
            })
            .catch((e) => {
              console.log(e)
            });
        });
      }
  
      return rdkitLoadingPromise;
    };
  })();