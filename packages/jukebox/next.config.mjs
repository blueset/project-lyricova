/* eslint-disable @typescript-eslint/no-var-requires */
import analyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({
  experimental: {
    appDir: true,
  },
  webpack: (config, options) => {
    // config.resolve.alias.react = path.resolve(__dirname, "node_modules/react");
    if (!config.externals) config.externals = {};
    config.externals.bufferutil = "bufferutil";
    config.externals["utf-8-validate"] = "utf-8-validate";
    return config;
  },
});

