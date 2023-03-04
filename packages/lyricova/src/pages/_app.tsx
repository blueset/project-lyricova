import { AppProps } from "next/app";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import PropTypes from "prop-types";
import React, { ReactNode } from "react";
import theme from "lyricova-common/frontendUtils/theme";
import Head from "next/head";
import { ApolloProvider } from "@apollo/client";
import apolloClient from "lyricova-common/frontendUtils/apollo";
import { CacheProvider, EmotionCache } from "@emotion/react";
import createEmotionCache from "../frontendUtils/createEmotionCache";
import { MonaSans, HubotSans, SourceHanSans } from "../fonts";
import "../styles/global.scss";
import { useRouter } from "next/router";
import { RouteRounded } from "@mui/icons-material";

export const getPlainLayout = (page: ReactNode) => <>{page}</>;

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

type AppPropsExtension = AppProps & {
  emotionCache?: EmotionCache;
  Component: AppProps["Component"] & {
    layout?: (children: React.ReactNode) => React.ReactNode;
  };
};

function MyApp({
  Component,
  pageProps,
  emotionCache = clientSideEmotionCache,
}: AppPropsExtension) {
  React.useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);
  const router = useRouter();
  const isDashboard =
    router.pathname.startsWith("/dashboard") ||
    router.pathname.startsWith("/login") ||
    router.pathname.startsWith("/logout");

  const getLayout = Component.layout || getPlainLayout;
  // const C = Component as React.FC;

  return (
    <div
      className={
        isDashboard
          ? undefined
          : `${MonaSans.variable} ${HubotSans.variable} ${SourceHanSans.variable} wrapper`
      }
    >
      <CacheProvider value={emotionCache}>
        <Head>
          <title>Project Lyricova</title>
          <meta
            name="viewport"
            content="minimum-scale=1, initial-scale=1, width=device-width"
          />
        </Head>
        <ThemeProvider theme={theme}>
          <ApolloProvider client={apolloClient}>
            {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
            {getLayout(<Component {...pageProps} />)}
            {/* <C {...pageProps} /> */}
            <CssBaseline />
          </ApolloProvider>
        </ThemeProvider>
      </CacheProvider>
    </div>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};

export default MyApp;
