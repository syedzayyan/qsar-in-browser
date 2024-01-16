import _ from "lodash";

export const initRDKit = (() => {
  let rdkitLoadingPromise;
  return () => {
    if (!rdkitLoadingPromise) {
      rdkitLoadingPromise = new Promise((resolve, reject) => {

        const script = document.createElement("script");
        script.src = "/qsar-in-browser/RDKit_minimal.js";
        script.async = true;
        document.body.appendChild(script);

        script.addEventListener("load", () => {
          initRDKitModule()
            .then((RDKit) => {
              resolve(RDKit);
            })
            .catch((e) => {
              console.log(e)
            });
        });
      });
    }

    return rdkitLoadingPromise;
  };
})();