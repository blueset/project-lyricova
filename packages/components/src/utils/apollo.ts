"use client";

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  HttpLink,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";
import { LS_JWT_KEY } from "./localStorage";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import posthog from "posthog-js";

const httpLink = createHttpLink({
  uri: "/graphql",
});

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage?.getItem(LS_JWT_KEY) ?? null;
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      posthog?.captureException(new Error(message), {
        extra: {
          locations,
          path,
        },
      });
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    posthog?.captureException(networkError);
  }
});

interface Process {
  env: Record<string, string | undefined>;
  browser: boolean;
}
declare var process: Process;

const link = (() => {
  const baseLink = errorLink.concat(authLink).concat(httpLink);
  // return authLink.concat(httpLink);
  if (process.browser) {
    const protocol = location.protocol === "http:" ? "ws:" : "wss:";
    let wsPort = location.port;
    const wsHost = location.hostname + (wsPort ? ":" + wsPort : "");
    const wsLink = new GraphQLWsLink(
      createClient({
        url: `${protocol}//${wsHost}/graphql`,
        connectionParams: {
          authToken: localStorage?.getItem(LS_JWT_KEY) ?? null,
        },
      })
    );
    // The split function takes three parameters:
    //
    // * A function that's called for each operation to execute
    // * The Link to use for an operation if the function returns a "truthy" value
    // * The Link to use for an operation if the function returns a "falsy" value
    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      baseLink
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
