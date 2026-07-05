import SchemaBuilder from "@pothos/core";
import ScopeAuthPlugin from "@pothos/plugin-scope-auth";
import DrizzlePlugin from "@pothos/plugin-drizzle";
import { GraphQLJSONObject } from "graphql-scalars";
import type { Request } from "express";
import type { User } from "../../models/User";
import { db, fullSchema } from "../../drizzle/client";

/**
 * Pothos schema builder (replaced the former TypeGraphQL setup).
 *
 * Object types are backed by Drizzle via `builder.drizzleObject`
 * (`@pothos/plugin-drizzle`) plus plain object refs for mapped/computed shapes.
 * The emitted schema must stay byte-compatible with schema.graphql
 * (`npm run schema:check`).
 */

export interface Context {
  user?: User | null;
  req?: Request;
}

export const builder = new SchemaBuilder<{
  Context: Context;
  DrizzleSchema: typeof fullSchema;
  DefaultFieldNullability: false;
  DefaultInputFieldRequiredness: true;
  Scalars: {
    Timestamp: { Input: Date; Output: Date | number };
    JSONObject: { Input: unknown; Output: unknown };
  };
  AuthScopes: {
    /** A user is logged in (any role). Mirrors `@Authorized()`. */
    loggedIn: boolean;
    /** The logged-in user is an admin. Mirrors `@Authorized("ADMIN")`. */
    admin: boolean;
  };
}>({
  plugins: [ScopeAuthPlugin, DrizzlePlugin],
  drizzle: {
    client: db,
  },
  // Match TypeGraphQL defaults so the emitted schema stays parity-compatible
  // without per-field annotations: output fields non-null, input fields required.
  defaultFieldNullability: false,
  defaultInputFieldRequiredness: true,
  scopeAuth: {
    authScopes: (context) => ({
      loggedIn: !!context.user,
      admin: context.user?.role === "admin",
    }),
  },
});

// --- Scalars (descriptions match schema.graphql for parity) ---

builder.addScalarType("JSONObject", GraphQLJSONObject);

builder.scalarType("Timestamp", {
  description:
    "The javascript `Date` as integer. Type represents date and time as number of milliseconds from start of UNIX epoch.",
  serialize: (value) =>
    value instanceof Date ? value.getTime() : (value as number),
  parseValue: (value) => new Date(value as number),
});

// --- Root operation types (fields are attached by resolver modules) ---

builder.queryType({});
builder.mutationType({});
builder.subscriptionType({});
