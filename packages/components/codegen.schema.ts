import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Schema-types codegen — the GraphQL counterpart to `@lyricova/api/openapi`.
 *
 * Generates a named TypeScript type for every object/enum/input in the GraphQL
 * contract (`packages/api/schema.graphql`), independent of any operation
 * documents. Frontend code that passes around whole schema value-objects as
 * shared prop shapes (e.g. `LyricsKitLyrics`, `Texture`, `AnimatedWord`)
 * imports them from `@lyricova/components/gql/schema` instead of the
 * Sequelize/TypeGraphQL model classes — fully decoupling from the ORM.
 *
 * Kept in a separate config (no `documents`) because the plain `typescript`
 * plugin strictly validates documents, which the not-yet-named operations in
 * the apps would fail; the client-preset run (codegen.ts) tolerates them.
 *
 * Regenerate via `npm run codegen -w @lyricova/components` (runs both configs).
 */
const config: CodegenConfig = {
  schema: "../api/schema.graphql",
  generates: {
    "src/gql/schema.ts": {
      plugins: ["typescript"],
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        // Preserve the schema's exact type names (e.g. VocaDBLyricsEntry) rather
        // than re-casing them (VocaDbLyricsEntry).
        namingConvention: { typeNames: "keep" },
        // Make nullable output fields required-but-nullable (`T | null`) instead
        // of optional, so these shapes line up with the client-preset fragment
        // result types at cross-package boundaries (e.g. jukebox passing a
        // schema `Album` into a components dialog typed by a fragment).
        avoidOptionals: { field: true },
        scalars: {
          Timestamp: "number",
          JSONObject: "Record<string, any>",
        },
      },
    },
  },
};

export default config;
