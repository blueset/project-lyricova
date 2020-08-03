import { ApolloClient, InMemoryCache } from "@apollo/client";

export default new ApolloClient({
  uri: "/graphql",
  cache: new InMemoryCache()
});