"use client";
import type { ReactNode } from "react";
import { createContext, useEffect, useContext } from "react";
import { useQuery } from "@apollo/client/react";
import { graphql } from "../gql";
import type { CurrentUserQuery } from "../gql/graphql";
import { useRouter } from "next/navigation";
import React from "react";
import { usePostHog } from "posthog-js/react";
import { authClient } from "../utils/auth";

interface AuthContextProps {
  /**
   * Set this value if redirect is needed when authorized.
   * Redirection happens only when visitor is not authorized by default.
   */
  authRedirect?: string;
  noRedirect?: boolean;
  children?: ReactNode;
}

const CURRENT_USER_QUERY = graphql(`
  query CurrentUser {
    currentUser {
      id
      username
      displayName
      role
      creationDate
      emailMD5
    }
  }
`);

type QueriedUser = NonNullable<CurrentUserQuery["currentUser"]>;

type UserContextType = {
  user?: QueriedUser;
  session: typeof authClient.$Infer.Session | null;
};

const AuthContextReact = createContext<UserContextType>({ session: null });

export function AuthContext({
  authRedirect,
  children,
  noRedirect,
}: AuthContextProps) {
  const {
    data: session,
    error: sessionError,
    isPending,
  } = authClient.useSession();
  const { loading, error, data } = useQuery(CURRENT_USER_QUERY, {
    skip: !session,
  });

  const router = useRouter();
  const postHog = usePostHog();

  useEffect(() => {
    if (noRedirect) return;

    const needAuth = !authRedirect;
    if (isPending || (session && loading)) return;
    if (sessionError || error) {
      console.error("Check auth error", sessionError ?? error);
      return;
    }
    const hasSession = !!session && !!data?.currentUser;
    if (hasSession && !needAuth) {
      router?.push(authRedirect);
    } else if (!hasSession && needAuth) {
      router?.push("/login");
    }
  }, [
    loading,
    error,
    data,
    session,
    sessionError,
    isPending,
    noRedirect,
    authRedirect,
    router,
  ]);

  useEffect(() => {
    if (postHog && data?.currentUser) {
      postHog.identify(`${data.currentUser.id}`, {
        username: data.currentUser.username,
        displayName: data.currentUser.displayName,
        role: data.currentUser.role,
        creationDate: data.currentUser.creationDate,
        emailMD5: data.currentUser.emailMD5,
      });
    }
  }, [postHog, data]);

  const value = {
    user: data?.currentUser ?? undefined,
    session: session ?? null,
  };

  return (
    <AuthContextReact.Provider value={value}>
      {children}
    </AuthContextReact.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContextReact);
export const AuthContextConsumer = AuthContextReact.Consumer;
