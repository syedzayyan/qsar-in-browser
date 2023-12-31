const CopyPlugin = require("copy-webpack-plugin");
const path = require('path')
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm",
            to: "static/chunks"
          }
        ]
      })
    );

    if (!isServer) {
      config.resolve.fallback = {
        fs: false
      };
    }

    return config;
  },   
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
};

module.exports = nextConfig;
