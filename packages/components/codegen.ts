import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Monorepo GraphQL Code Generator config (client-preset).
 *
 * `@lyricova/components` is the shared library that defines the reusable
 * fragments consumed by both the `jukebox` and `lyricova` apps, so the typed
 * document graph is generated *here* and re-exported via
 * `@lyricova/components/gql`. The `documents` globs intentionally span every
 * package so that fragment masking and the typed `graphql()` function work
 * across package boundaries.
 *
 * Schema source: the committed `packages/api/schema.graphql` (the Phase 0
 * parity baseline). Regenerate with `npm run codegen -w @lyricova/components`.
 */
const config: CodegenConfig = {
  schema: "../api/schema.graphql",
  documents: [
    "src/**/*.{ts,tsx}",
    "../jukebox/src/**/*.{ts,tsx}",
    "../lyricova/src/**/*.{ts,tsx}",
    "!**/gql/**",
    "!**/*.d.ts",
    // Excluded: runtime-built (dynamic) mutation that cannot be statically
    // analyzed by codegen; it stays on Apollo's `gql` tag.
    "!../jukebox/src/app/**/imports/clientPage.tsx",
  ],
  ignoreNoDocuments: true,
  generates: {
    "src/gql/": {
      preset: "client",
      presetConfig: {
        // Fragments are used as directly-accessed, reusable entity shapes in
        // this codebase (and are merged with non-GraphQL VocaDB data), so
        // masking is disabled: fragment fields inline into operation results
        // and a plain `<Name>Fragment` type is emitted for reuse.
        fragmentMasking: false,
      },
      config: {
        useTypeImports: true,
        scalars: {
          // Map the API's custom scalars to TS types the frontend already uses.
          Timestamp: "number",
          JSONObject: "Record<string, unknown>",
        },
      },
    },
  },
};

export default config;
