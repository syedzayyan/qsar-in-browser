const CopyPlugin = require("copy-webpack-plugin");

const nextConfig = {  
  output: "export",
  basePath: "/qsar-in-browser",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;