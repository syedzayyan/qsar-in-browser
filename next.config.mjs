/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.module.rules.push(
      {
        test: /\.md$/,
        // This is the asset module.
        type: 'asset/source',
      }
    )
    return config
  },
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;