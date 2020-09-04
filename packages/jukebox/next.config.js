/* eslint-disable @typescript-eslint/no-var-requires */
const analyzer = require("@next/bundle-analyzer");

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer({});