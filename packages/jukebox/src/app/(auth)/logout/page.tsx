"use client";

import { useEffect } from "react";
import { LS_JWT_KEY } from "@lyricova/components";
import { useRouter } from "next/navigation";
import { useApolloClient } from "@apollo/client";

export default function Logout() {
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
