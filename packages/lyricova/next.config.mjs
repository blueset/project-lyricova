import analyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

const config = withBundleAnalyzer({
  transpilePackages: ["@lyricova/components"],
  async redirects() {
    return [
      {
        source: "/pages/1",
        destination: "/",
        permanent: true,
      },
      {
        source: "/tags/:slug/pages/1",
        destination: "/tags/:slug",
        permanent: true,
      },
    ];
  },
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
      {
        source: "/feed",
        destination: "http://localhost:8083/feed",
      },
    ];
  },
  experimental: {
    proxyTimeout: 3600_000,
  },
});

export default config;
