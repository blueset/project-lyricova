#!/usr/bin/env node
/**
 * Emits the OpenAPI 3.1 document by running swagger-jsdoc over the same file
 * globs as controller/DocsController.ts. swagger-jsdoc parses the hand-written
 * `@openapi` JSDoc statically (no DB / no running server), so this can run in
 * CI to feed `openapi-typescript`.
 */
import { writeFileSync } from "node:fs";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.1.1",
    info: { title: "Lyricova API", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: [
    "./src/controller/*.ts",
    "./src/models/*.ts",
    "./src/graphql/LyricsKitObjects.ts",
    "./src/utils/adminOnlyMiddleware.ts",
  ],
};

const spec = swaggerJsdoc(options);
const schemas = Object.keys(spec.components?.schemas ?? {}).sort();
const paths = Object.keys(spec.paths ?? {}).length;
writeFileSync("openapi.json", JSON.stringify(spec, null, 2));
console.log(`wrote openapi.json — ${schemas.length} schemas, ${paths} paths`);
console.log("schemas:", schemas.join(", "));
