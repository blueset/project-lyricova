import { useEffect } from "react";
import { LS_JWT_KEY } from "../frontendUtils/localStorage";
import apolloClient from "../frontendUtils/apollo";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const req = context.req as unknown as Express.Request;
  req.logout();
  return {
    props: {}, // will be passed to the page component as props
  };
};

export default function Logout() {
  const router = useRouter();
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
  }, [router]);
  return <></>;
}