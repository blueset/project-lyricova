import analyzer from "@next/bundle-analyzer";
import { withSuperjson } from "next-superjson";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withSuperjson()(withBundleAnalyzer({
  webpack: (config, options) => {
    // config.resolve.alias.react = path.resolve(__dirname, "node_modules/react");
    return config;
  },
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
  modularizeImports: {
    lodash: {
      transform: "lodash/{{member}}"
    },
    "@mui/material": {
      transform: "@mui/material/{{member}}"
    },
    "@mui/core": {
      transform: "@mui/core/{{member}}"
    },
    "@mui/lab": {
      transform: "@mui/lab/{{member}}"
    },
    "@mui/icons-material/?(((\\w*)?/?)*)": {
      transform: "@mui/icons-material/{{ matches.[1] }}/{{member}}"
    }
  }
}));

