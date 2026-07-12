"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApolloProvider, useApolloClient } from "@apollo/client/react";
import { authClient, apolloClient } from "@lyricova/components";

function Logout() {
  const router = useRouter();
  const apolloClient = useApolloClient();

  useEffect(() => {
    void (async () => {
      await authClient.signOut();
      await apolloClient.clearStore();
      router.push("/login");
    })();
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
