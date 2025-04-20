/* eslint-disable @typescript-eslint/no-var-requires */
import analyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({
  transpilePackages: ["@lyricova/components"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8083/api/:path*",
      },
      {
        source: "/graphql",
        destination: "http://localhost:8083/graphql",
      },
    ];
  },
});
