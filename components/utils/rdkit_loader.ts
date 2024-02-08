import _ from "lodash";

export const initRDKit = (() => {
  let rdkitLoadingPromise: Promise<any>;

  return (): Promise<any> => {
    if (!rdkitLoadingPromise) {
      rdkitLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/RDKit_minimal.js";
        script.async = true;
        document.body.appendChild(script);

        script.addEventListener("load", () => {
          globalThis.initRDKitModule()
            .then((RDKit) => {
              resolve(RDKit);
            })
            .catch((e) => {
              alert('RDKIT Cannot be Loaded')
            });
        });
      });
    }

    return rdkitLoadingPromise;
  };
})();
