import analyzer from "@next/bundle-analyzer";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { config as loadRootEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load the repo-root .env (e.g. PostHog sourcemap credentials) without
// overriding this package's local .env values.
loadRootEnv({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
  quiet: true,
});

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

// Upload PostHog sourcemaps during CI builds by default; opt in locally with
// POSTHOG_SOURCEMAPS=1, or force off with POSTHOG_SOURCEMAPS=0. (Note: `next
// build` always sets NODE_ENV=production, so CI is the reliable prod signal.)
const uploadSourcemaps = (() => {
  const flag = process.env.POSTHOG_SOURCEMAPS;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return (
    Boolean(process.env.POSTHOG_ENV_ID && process.env.POSTHOG_API_KEY) &&
    process.env.CI === "true"
  );
})();

const config = withPostHogConfig(
  withBundleAnalyzer({
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
    projectId: process.env.POSTHOG_ENV_ID,
    sourcemaps: {
      enabled: uploadSourcemaps,
      releaseName: "lyricova-blog",
      deleteAfterUpload: true,
    },
  },
);

export default config;
