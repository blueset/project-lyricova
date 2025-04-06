"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApolloClient, ApolloProvider } from "@apollo/client";
import { LS_JWT_KEY, apolloClient } from "@lyricova/components";

function Logout() {
  const router = useRouter();
  const apolloClient = useApolloClient();

  useEffect(() => {
    const hasToken = Boolean(localStorage?.getItem(LS_JWT_KEY) ?? null);
    if (hasToken) {
      localStorage.removeItem(LS_JWT_KEY);
      apolloClient.resetStore().then(() => {
        router.push("/login");
      });
    } else {
      router.push("/login");
    }
  }, [apolloClient, router]);
  return <></>;
}

export default function LogoutWithApollo() {
  return (
    <ApolloProvider client={apolloClient}>
      <Logout />
    </ApolloProvider>
  );
}
