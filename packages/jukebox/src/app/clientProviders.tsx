"use client";

import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@lyricova/components";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
