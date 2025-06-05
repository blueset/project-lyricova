"use client";

import { ApolloProvider } from "@apollo/client";
import { apolloClient, TelemetryProvider } from "@lyricova/components";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <TelemetryProvider
      clarityProjectId={process.env.NEXT_PUBLIC_CLARITY_ID}
      postHogKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
      postHogHost={process.env.NEXT_PUBLIC_POSTHOG_HOST}
    >
      <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
    </TelemetryProvider>
  );
}
