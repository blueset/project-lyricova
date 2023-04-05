import type { AppProps } from "next/app";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import PropTypes from "prop-types";
import type { ReactNode} from "react";
import React, { useEffect } from "react";
import theme from "lyricova-common/frontendUtils/theme";
import Head from "next/head";
import type { EmotionCache } from "@emotion/react";
import { CacheProvider } from "@emotion/react";
import createEmotionCache from "../frontendUtils/createEmotionCache";
import {
  MonaSans,
  HubotSans,
  SourceHanSans,
  SourceHanSansPunct,
} from "../fonts";
import "../styles/global.scss";
import { useRouter } from "next/router";
import { TransitionCover } from "../components/public/TransitionCover";
import GlobalStyles from "@mui/material/GlobalStyles";
import { siteName } from "../utils/consts";

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
  const isFullScreen =
    router.pathname.startsWith("/screensavers") || router.pathname === "/tags";

  useEffect(() => {
    if (!isDashboard) {
      document.body.classList.add(
        "wrapper",
        MonaSans.variable,
        HubotSans.variable,
        SourceHanSans.variable,
        SourceHanSansPunct.variable
      );
    } else {
      document.body.classList.remove(
        "wrapper",
        MonaSans.variable,
        HubotSans.variable,
        SourceHanSans.variable,
        SourceHanSansPunct.variable
      );
    }
    document.body.dataset.path = router.pathname;
  }, [isDashboard, router.pathname]);

  const getLayout = Component.layout || getPlainLayout;

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>{siteName}</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#c56cf0" />
        <meta name="apple-mobile-web-app-title" content={siteName} />
        <meta name="application-name" content={siteName} />
        <meta name="theme-color" content="#c56cf0" />
      </Head>
      <ThemeProvider theme={theme}>
        <GlobalStyles
          styles={{
            ":root": {
              fontSize: isDashboard ? ["16px", "!important"] : undefined,
              height: isFullScreen ? "100%" : undefined,
            },
          }}
        />
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        {isDashboard ? (
          getLayout(<Component {...pageProps} />)
        ) : (
          <Component {...pageProps} />
        )}
        <CssBaseline />
      </ThemeProvider>
      {!isDashboard && <TransitionCover />}
    </CacheProvider>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};

export default MyApp;
