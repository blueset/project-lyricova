"use client";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  CombinedGraphQLErrors,
} from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import posthog from "posthog-js";

const httpLink = new HttpLink({
  uri: "/graphql",
  credentials: "same-origin",
});

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      );
      posthog?.captureException(new Error(message), {
        extra: {
          locations,
          path,
        },
      });
    });
  } else {
    console.error(`[Network error]: ${error}`);
    posthog?.captureException(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
});

interface Process {
  env: Record<string, string | undefined>;
  browser: boolean;
}
declare let process: Process;

const link = (() => {
  const baseLink = errorLink.concat(httpLink);
  if (process.browser) {
    const protocol = location.protocol === "http:" ? "ws:" : "wss:";
    const wsPort = location.port;
    const wsHost = location.hostname + (wsPort ? ":" + wsPort : "");
    const wsLink = new GraphQLWsLink(
      createClient({
        url: `${protocol}//${wsHost}/graphql`,
      }),
    );
    // The split function takes three parameters:
    //
    // * A function that's called for each operation to execute
    // * The Link to use for an operation if the function returns a "truthy" value
    // * The Link to use for an operation if the function returns a "falsy" value
    const splitLink = ApolloLink.split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      baseLink,
    );

    return splitLink;
  } else {
    return baseLink;
  }
})();

export default new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
