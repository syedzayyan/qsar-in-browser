import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

let jsmeIsLoaded = false;
const jsmeCallbacks = {};

// Export the setup function so that a user can override the super-lazy loading behaviour and choose to load it more eagerly.
export function setup(src = "/jsme/jsme.nocache.js") {
  const script = document.createElement('script');
  script.src = src;
  document.head.appendChild(script);
  globalThis.jsmeOnLoad = () => {
    if (jsmeCallbacks && typeof jsmeCallbacks === 'object') {
      Object.values(jsmeCallbacks).forEach(f => typeof f === 'function' && f());
    }
    jsmeIsLoaded = true;
  }
}

const Jsme = ({ height, width, smiles, options, onChange, src }) => {
  const myRef = useRef(null);
  const id = `jsme${getRandomInt(1, 100000)}`;
  const prevPropsRef = useRef({ height, width, smiles, options });

  const handleJsmeLoad = useCallback(() => {
    if (options) {
      const jsmeApplet = new globalThis.JSApplet.JSME(id, width, height, { options });
      jsmeApplet.setCallBack("AfterStructureModified", handleChange);
      jsmeApplet.readGenericMolecularInput(smiles);
    } else {
      const jsmeApplet = new globalThis.JSApplet.JSME(id, width, height, {
        "options": "newlook",
        "guicolor": "#FFFFFF",
        "guiAtomColor": "#000000"
      });
      jsmeApplet.setCallBack("AfterStructureModified", handleChange);
      jsmeApplet.readGenericMolecularInput(smiles);
    }
  }, [height, width, smiles, options, id]);

  const handleChange = useCallback((jsmeEvent) => {
    if (onChange) {
      onChange(jsmeEvent.src.smiles());
    }
  }, [onChange]);

  useEffect(() => {
    if (myRef.current && myRef.current.children.length < 1) {
      if (jsmeIsLoaded) {
        handleJsmeLoad();
      } else {
        if (!globalThis.jsmeOnLoad) {
          setup(src);
        }
        jsmeCallbacks[id] = handleJsmeLoad;
      }
  
      return () => {
        jsmeCallbacks[id] = undefined;
      };
    }
  }, []);

  useEffect(() => {
    if (myRef.current) {
      const jsmeApplet = myRef.current.jsmeApplet;
      const prevProps = prevPropsRef.current;

      if (jsmeApplet !== undefined && jsmeApplet !== null) {
        if (height !== prevProps.height || width !== prevProps.width) {
          jsmeApplet.setSize(width, height);
        }
        if (options !== prevProps.options) {
          jsmeApplet.options({ options });
        }
        if (smiles !== prevProps.smiles) {
          jsmeApplet.readGenericMolecularInput(smiles);
        }
      }

      prevPropsRef.current = { height, width, smiles, options };
    }
  }, [height, width, smiles, options]);

  return <div ref={myRef} id={id}></div>;
};

Jsme.propTypes = {
  height: PropTypes.string.isRequired,
  width: PropTypes.string.isRequired,
  smiles: PropTypes.string,
  options: PropTypes.string,
  onChange: PropTypes.func,
  src: PropTypes.string,
};

export default Jsme;