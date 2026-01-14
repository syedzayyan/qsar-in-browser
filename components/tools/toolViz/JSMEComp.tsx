import React, {
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";

let jsmeIsLoaded = false;
const jsmeCallbacks: Record<string, () => void> = {};

export function setup(src: string = "/jsme/jsme.nocache.js") {
  if (document.querySelector(`script[src="${src}"]`)) return;

  const script = document.createElement("script");
  script.src = src;
  document.head.appendChild(script);

  (globalThis as any).jsmeOnLoad = () => {
    Object.values(jsmeCallbacks).forEach(cb => cb?.());
    jsmeIsLoaded = true;
  };
}

export interface JsmeProps {
  width?: string;
  height?: string;
  smiles?: string;
  options?: string;
  onChange?: (smiles: string) => void;
  src?: string;
  id?: string;
}

const Jsme: React.FC<JsmeProps> = ({
  width = "400px",
  height = "300px",
  smiles = "",
  options,
  onChange,
  src,
  id,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appletRef = useRef<any>(null); // ✅ SINGLE SOURCE OF TRUTH
  const reactId = useId();
  const jsmeId = id ?? `jsme-${reactId}`;

  const prevPropsRef = useRef({ width, height, smiles, options });

  const handleChange = useCallback(
    (e: any) => {
      onChange?.(e.src.smiles());
    },
    [onChange]
  );

  const initJsme = useCallback(() => {
    // ✅ Guard against double creation
    if (appletRef.current) return;

    const config = options
      ? { options }
      : {
          options: "newlook",
          guicolor: "#FFFFFF",
          guiAtomColor: "#000000",
        };

    const applet = new (globalThis as any).JSApplet.JSME(
      jsmeId,
      width,
      height,
      config
    );

    applet.setCallBack("AfterStructureModified", handleChange);
    applet.readGenericMolecularInput(smiles);

    appletRef.current = applet;
  }, [width, height, smiles, options, handleChange, jsmeId]);

  /**
   * Initial mount (StrictMode-safe)
   */
  useEffect(() => {
    if (!containerRef.current) return;

    if (jsmeIsLoaded) {
      initJsme();
    } else {
      if (!(globalThis as any).jsmeOnLoad) {
        setup(src);
      }
      jsmeCallbacks[jsmeId] = initJsme;
    }

    return () => {
      delete jsmeCallbacks[jsmeId];
      // ❗ DO NOT clear appletRef here — StrictMode remount depends on it
    };
  }, []);

  /**
   * Prop updates
   */
  useEffect(() => {
    const applet = appletRef.current;
    const prev = prevPropsRef.current;

    if (!applet) return;

    if (width !== prev.width || height !== prev.height) {
      applet.setSize(width, height);
    }

    if (options !== prev.options && options) {
      applet.options({ options });
    }

    if (smiles !== prev.smiles) {
      applet.readGenericMolecularInput(smiles);
    }

    prevPropsRef.current = { width, height, smiles, options };
  }, [width, height, smiles, options]);

  return <div ref={containerRef} id={jsmeId} />;
};

export default Jsme;
