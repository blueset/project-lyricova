import { createContext, useEffect, useContext, ReactNode } from "react";
import { User } from "../models/User";
import { useQuery, gql } from "@apollo/client";
import { useRouter } from "next/router";
import { LS_JWT_KEY } from "../frontendUtils/localStorage";
import React from "react";

interface AuthContextProps {
  /**
   * Set this value if redirect is needed when authorized.
   * Redirection happens only when visitor is not authorized by default.
   */
  authRedirect?: string;

  noRedirect?: boolean;
  children?: ReactNode;
}

const CURRENT_USER_QUERY = gql`
  query {
    currentUser {
      id
      username
      displayName
      role
      creationDate
      emailMD5
    }
  }
`;
type QueriedUser = Pick<
  User,
  "id" | "username" | "displayName" | "role" | "creationDate" | "emailMD5"
>;

type UserContextType = {
  user?: QueriedUser;
  jwt: () => string | null;
};

const AuthContextReact = createContext<UserContextType>({ jwt: () => null });

export function AuthContext({
  authRedirect,
  children,
  noRedirect,
}: AuthContextProps) {
  const { loading, error, data } = useQuery<{ currentUser: QueriedUser }>(
    CURRENT_USER_QUERY
  );

  const router = useRouter();

  useEffect(() => {
    if (noRedirect) return;

    const needAuth = !authRedirect;
    const token = window.localStorage?.getItem(LS_JWT_KEY);
    let hasToken = !!(token ?? null);
    if (hasToken) {
      if (loading) return;
      if (error) {
        console.error("Check auth error", error);
        return;
      }
      hasToken = !!data?.currentUser;
      if (hasToken === false) {
        window.localStorage?.removeItem(LS_JWT_KEY);
      }
    }
    if (hasToken && !needAuth) {
      router.push(authRedirect);
    } else if (!hasToken && needAuth) {
      router.push("/login");
    }
  }, [loading, error, data, noRedirect, authRedirect, router]);

  const value = {
    user: data?.currentUser ?? undefined,
    jwt: () => window.localStorage?.getItem(LS_JWT_KEY),
  };

  return (
    <AuthContextReact.Provider value={value}>
      {children}
    </AuthContextReact.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContextReact);
export const AuthContextConsumer = AuthContextReact.Consumer;
