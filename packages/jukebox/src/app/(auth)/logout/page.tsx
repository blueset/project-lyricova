"use client";
import { useEffect } from "react";
import { authClient } from "@lyricova/components";
import { useRouter } from "next/navigation";
import { useApolloClient } from "@apollo/client/react";

export default function Logout() {
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
