"use client";

import { ApolloProvider } from "@apollo/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import apolloClient from "lyricova-common/frontendUtils/apollo";
import theme from "lyricova-common/frontendUtils/theme";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        {children}
        <CssBaseline />
      </ThemeProvider>
    </ApolloProvider>
  );
}
