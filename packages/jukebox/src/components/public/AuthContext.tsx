import { ReactChild, createContext, useEffect, useContext } from "react";
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
  children?: ReactChild;
}

const CURRENT_USER_QUERY = gql`
  query {
    currentUser {
      id
      username
      displayName
      email
      role
      creationDate
    }
  }
`;

const AuthContextReact = createContext<Partial<User>>(null);

export function AuthContext({ authRedirect, children, noRedirect }: AuthContextProps) {
  const {
    loading,
    error,
    data,
  } = useQuery<{ currentUser: User }>(CURRENT_USER_QUERY);

  const router = useRouter();

  useEffect(() => {
    if (noRedirect) return;

    const needAuth = !Boolean(authRedirect);
    let hasToken = Boolean(localStorage?.getItem(LS_JWT_KEY) ?? null);
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
  }, [loading, error, data]);

  return <AuthContextReact.Provider value={data?.currentUser ?? null}>
    {children}
  </AuthContextReact.Provider>;
}

export const useAuthContext = () => useContext(AuthContextReact);