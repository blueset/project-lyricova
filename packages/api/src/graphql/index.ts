import type { Application } from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import type { Server } from "http";
import { createServer } from "http";
import type { ServerOptions } from "ws";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import cors from "cors";
import { json } from "express";
import { printSchema } from "graphql";
import { writeFileSync } from "fs";
import { buildPothosSchema } from "./pothos/schema.js";
import type { Context } from "./pothos/builder.js";
import { postHog } from "../utils/posthog.js";

export async function applyApollo(app: Application): Promise<Server> {
  // GraphQL schema is now built with Pothos (replacing TypeGraphQL).
  const schema = buildPothosSchema();

  // Keep schema.graphql fresh for the frontend codegen + parity checks
  // (replaces the TypeGraphQL `emitSchemaFile` behaviour).
  try {
    writeFileSync(`${import.meta.dirname}/../../schema.graphql`, printSchema(schema));
  } catch (e) {
    console.error("Failed to emit schema.graphql:", e);
  }

  const httpServer = createServer(app);

  const wsConfig: ServerOptions = {
    path: "/graphql",
  };
  wsConfig.server = httpServer;

  const wsServer = new WebSocketServer(wsConfig, () =>
    console.log("Websocket server started"),
  );

  const serverCleanup = useServer(
    {
      schema,
      context: async (): Promise<Context> => {
        return { user: null };
      },
    },
    wsServer,
  );

  const apolloServer = new ApolloServer<Context>({
    schema,
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },

      // Telemetry
      {
        async requestDidStart() {
          return {
            async didResolveOperation(requestContext) {
              const { operation } = requestContext;
              if (operation) {
                operation?.selectionSet?.selections?.forEach((element) => {
                  if (element.kind !== "Field") return;
                  try {
                    postHog?.capture({
                      distinctId:
                        requestContext.contextValue?.user?.id.toString() ??
                        "unknown",
                      event: `graphql ${operation.operation} requested`,
                      properties: {
                        operationType: operation.operation,
                        operationName: operation.name?.value ?? undefined,
                        operationField: element.name.value,
                      },
                    });
                  } catch (error) {
                    console.error("Error capturing PostHog event:", error);
                  }
                });
              }
            },
          };
        },
        async unexpectedErrorProcessingRequest({ requestContext, error }) {
          console.error("Unexpected error in GraphQL request:", error);
          postHog?.captureException(
            error,
            requestContext.contextValue?.user?.id.toString() ?? "unknown",
            {
              properties: {
                operationName: requestContext.request?.operationName,
                query: requestContext.request?.query,
                variables: requestContext.request?.variables,
              },
            },
          );
        },
      },
    ],
    cache: "bounded",
  });

  await apolloServer.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<Context> => ({
        user: req.user as Context["user"],
        req,
      }),
    }),
  );

  return httpServer;
}
