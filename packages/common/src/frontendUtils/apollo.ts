import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  HttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { LS_JWT_KEY } from "./localStorage";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

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

interface Process {
  env: Record<string, string | undefined>;
  browser: boolean;
}
declare var process: Process;

const link = (() => {
  // return authLink.concat(httpLink);
  if (process.browser) {
    const protocol = location.protocol === "http:" ? "ws:" : "wss:";
    let wsPort = location.port;
    if (process.env.NODE_ENV === "development") {
      wsPort = "30001";
    }
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
      authLink.concat(httpLink)
    );

    return splitLink;
  } else {
    return authLink.concat(httpLink);
  }
})();

export default new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
