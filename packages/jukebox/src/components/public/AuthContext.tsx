import { ReactChild, createContext, useEffect, useContext, ReactNode } from "react";
import { User } from "../../models/User";
import { useQuery, gql } from "@apollo/client";
import { useRouter } from "next/router";
import { LS_JWT_KEY } from "../../frontendUtils/localStorage";

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

type QueriedUser = Pick<User, "id" | "username" | "displayName" | "role" | "creationDate" | "emailMD5">;

const AuthContextReact = createContext<QueriedUser>(null);

export function AuthContext({ authRedirect, children, noRedirect }: AuthContextProps) {
  const {
    loading,
    error,
    data,
  } = useQuery<{ currentUser: QueriedUser }>(CURRENT_USER_QUERY);

  const router = useRouter();

  useEffect(() => {
    if (noRedirect) return;

    const needAuth = !Boolean(authRedirect);
    const token = window.localStorage?.getItem(LS_JWT_KEY);
    let hasToken = Boolean(token ?? null);
    if (hasToken === needAuth) { // If checking local storage token is not decisive
      if (loading) return;
      if (error) {
        console.error("Check auth error", error);
        return;
      }
      hasToken = Boolean(data.currentUser);
    }
    if (hasToken && !needAuth) {
      router.push(authRedirect);
    } else if (!hasToken && needAuth) {
      router.push("/login");
    }
  }, [loading, error, data, noRedirect, authRedirect, router]);

  return <AuthContextReact.Provider value={data?.currentUser ?? null}>
    {children}
  </AuthContextReact.Provider>;
}

export const useAuthContext = () => useContext(AuthContextReact);
export const AuthContextConsumer = AuthContextReact.Consumer;