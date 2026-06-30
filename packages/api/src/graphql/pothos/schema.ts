import { builder } from "./builder";

// Type modules (register object/input/enum types on the builder).
import "./types/Texture";
import "./types/User";
import "./types/Transliteration";
import "./types/leaf";

// Resolver modules (attach query/mutation/subscription fields).
import "./resolvers/texture";
import "./resolvers/stats";
import "./resolvers/siteMeta";
import "./resolvers/user";
import "./resolvers/transliteration";
import "./resolvers/llm";

/**
 * Builds the Pothos `GraphQLSchema`. As the Phase 2 port progresses, importing
 * more type/resolver modules above grows this schema toward full parity with
 * `schema.graphql`. Once complete, `applyApollo` will consume this instead of
 * the TypeGraphQL `buildSchema`.
 */
export function buildPothosSchema() {
  return builder.toSchema();
}
