import { useEffect } from "react";
import { LS_JWT_KEY } from "lyricova-common/frontendUtils/localStorage";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { useApolloClient, ApolloProvider } from "@apollo/client";
import apolloClient from "lyricova-common/frontendUtils/apollo";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const req = context.req as unknown as Express.Request;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  req.logout(() => {});
  return {
    props: {}, // will be passed to the page component as props
  };
};

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
