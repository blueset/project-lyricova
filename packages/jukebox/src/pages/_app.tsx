import type { AppProps } from "next/app";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";
import PropTypes from "prop-types";
import React, { useEffect } from "react";
import theme from "lyricova-common/frontendUtils/theme";
import Head from "next/head";
import { ApolloProvider } from "@apollo/client";
import apolloClient from "lyricova-common/frontendUtils/apollo";
import type { NextComponentType } from "next";
import { getLayout as getPlainLayout } from "../components/public/layouts/PlainLayout";
import {
  Inter,
  SourceHanSans,
  SourceHanSansPunct,
  SourceHanSerif,
} from "../fonts";
import { AppCacheProvider } from "lyricova-common/utils/mui/pagesRouterApp";

const themeMod = createTheme({
  ...theme,
  typography: {
    fontFamily:
      "var(--font-inter),var(--font-source-han-sans)," +
      theme.typography.fontFamily,
  },
  components: {
    ...theme.components,
    MuiCssBaseline: {
      ...theme.components?.MuiCssBaseline,
      styleOverrides: {
        ...(theme.components?.MuiCssBaseline?.styleOverrides as object),
        "body:lang(zh), body:lang(ja)": {
          fontFamily: `var(--font-source-han-sans-punct),var(--font-inter),var(--font-source-han-sans),${theme.typography.fontFamily}`,
        },
      },
    },
  },
});

type AppPropsExtension = AppProps & {
  Component: NextComponentType & {
    layout?: (children: React.ReactChild) => React.ReactChild;
  };
};

function MyApp({ Component, pageProps, ...props }: AppPropsExtension) {
  useEffect(() => {
    document.body.classList.add(
      Inter.variable,
      SourceHanSans.variable,
      SourceHanSansPunct.variable,
      SourceHanSerif.variable
    );

    if (
      /eruda=true/.test(window.location.toString()) ||
      localStorage.getItem("active-eruda") == "true"
    ) {
      const src = "//cdn.jsdelivr.net/npm/eruda";
      const importScript = document.createElement("script");
      importScript.src = src;
      importScript.onload = () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        eruda.init();
      };
      document.head.appendChild(importScript);
    }
  }, []);

  const getLayout = Component.layout || getPlainLayout;

  return (
    <AppCacheProvider {...props}>
      <Head>
        <title>Lyricova Jukebox</title>
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
        <meta name="apple-mobile-web-app-title" content="Lyricova Jukebox" />
        <meta name="application-name" content="Lyricova Jukebox" />
        <meta name="theme-color" content="#c56cf0" />
      </Head>
      <ApolloProvider client={apolloClient}>
        <ThemeProvider theme={themeMod}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          {getLayout(<Component {...pageProps} />)}
        </ThemeProvider>
      </ApolloProvider>
    </AppCacheProvider>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};

export default MyApp;
