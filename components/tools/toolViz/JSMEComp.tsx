import Script from "next/script";

export default function JSME({ height = "500", width = "500", onChange, id }) {
  async function jsmeScripHandler() {
    setTimeout(() => {
      var jsmeApplet = new globalThis.JSApplet.JSME(id, width, height, {
        "options": "newlook",
        "guicolor": "#FFFFFF",
        "guiAtomColor": "#000000"
      });
      jsmeApplet.setCallBack("AfterStructureModified", (event) => {
        onChange(event.src.smiles());
      });
    }, 100)
  }

  return (
    <div>
      <Script src="/jsme/jsme.nocache.js" strategy="afterInteractive" onLoad={jsmeScripHandler} />
      <div id={id}></div>
    </div>
  )
}