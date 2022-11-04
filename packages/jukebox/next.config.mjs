/* eslint-disable @typescript-eslint/no-var-requires */
import analyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({
  webpack: (config, options) => {
    // config.resolve.alias.react = path.resolve(__dirname, "node_modules/react");
    return config;
  },
});

