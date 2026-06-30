// Runtime GraphQL smoke harness: executes a query against the built Pothos schema
// with a live DB + admin context. Writes JSON result to /tmp/gql-result.json.
// Usage: node scripts/gql-smoke.mjs '<query>'
import "reflect-metadata";
import { writeFileSync } from "fs";
import { graphql } from "graphql";
import { buildPothosSchema } from "../dist/graphql/pothos/schema.js";

const schema = buildPothosSchema();
const query = process.argv[2] ?? "{ __typename }";
const adminUser = { id: 1, role: "admin" };
const res = await graphql({
  schema,
  source: query,
  contextValue: { user: adminUser, req: { user: adminUser } },
});
writeFileSync("/tmp/gql-result.json", JSON.stringify(res, null, 1));
console.log(res.errors ? "HAS_ERRORS" : "OK");
process.exit(0);
