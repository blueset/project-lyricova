import { AppProps } from "next/app";
import { ThemeProvider, CssBaseline } from "@material-ui/core";
import PropTypes from "prop-types";
import React from "react";
import theme from "../frontendUtils/theme";
import Head from "next/head";
import { ApolloProvider } from "@apollo/client";
import apolloClient from "../frontendUtils/apollo";
import { NextComponentType } from "next";
import { getLayout as getPlainLayout } from "../components/public/layouts/PlainLayout";
import { polyfill } from "seamless-scroll-polyfill";

type AppPropsExtension = AppProps & {
  Component: NextComponentType & {
    layout?: (children: React.ReactChild) => React.ReactChild;
  };
}


export default function MyApp({ Component, pageProps }: AppPropsExtension) {

  React.useEffect(() => {
    polyfill();
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);

  const getLayout = Component.layout || getPlainLayout;

  return (
    <>
      <Head>
        <title>Lyricova Jukebox</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </Head>
      <ApolloProvider client={apolloClient}>
        <ThemeProvider theme={theme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          {getLayout(<Component {...pageProps} />)}
        </ThemeProvider>
      </ApolloProvider>
    </>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};
