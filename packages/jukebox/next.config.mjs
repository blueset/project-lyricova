/* eslint-disable @typescript-eslint/no-var-requires */
import analyzer from "@next/bundle-analyzer";
import { withPostHogConfig } from "@posthog/nextjs-config";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withPostHogConfig(
  withBundleAnalyzer({
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
        {
          source: "/ingest/static/:path*",
          destination: "https://us-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/ingest/:path*",
          destination: "https://us.i.posthog.com/:path*",
        },
        {
          source: "/ingest/decide",
          destination: "https://us.i.posthog.com/decide",
        },
      ];
    },
    // This is required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,
    experimental: {
      proxyTimeout: 3600_000,
    },
  }),
  {
    personalApiKey: process.env.POSTHOG_API_KEY,
    envId: process.env.POSTHOG_ENV_ID,
    sourcemaps: {
      project: "lyricova-jukebox",
      deleteAfterUpload: true,
    },
  }
);
