const CopyPlugin = require("copy-webpack-plugin");
const { PyodidePlugin } = require("@pyodide/webpack-plugin");

const nextConfig = {
  // webpack(config, { isServer }) {
  //   config.plugins.push(
  //     new CopyPlugin({
  //       patterns: [
  //         {
  //           from: "node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm",
  //           to: "static/chunks"
  //         }
  //       ]
  //     }), 
  //     new PyodidePlugin(),
  //   );

  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       fs: false
  //     };
  //   }

  //   return config;
  // },   
  
  output: "export",
  basePath: "/sar-in-browser",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
