import { ApolloClient, InMemoryCache, createHttpLink, split, defaultDataIdFromObject } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { LS_JWT_KEY } from "./localStorage";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";

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
    }
  };
});

const link = (() => {
  if (process.browser) {
    const protocol = location.protocol === "http:" ? "ws:" : "wss:";
    const host = location.hostname + (location.port ? ":" + location.port : "");
    const wsLink = new WebSocketLink({
      uri: `${protocol}//${host}/graphql`,
      options: {
        reconnect: true,
        connectionParams: () => {
          const token = localStorage?.getItem(LS_JWT_KEY) ?? null;
          return {
            authorization: token,
          };
        },
      }
    });

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
      authLink.concat(httpLink),
    );

    return splitLink;
  } else {
    return httpLink;
  }
})();


export default new ApolloClient({
  link,
  cache: new InMemoryCache()
});