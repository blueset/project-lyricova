"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { ApolloProvider } from "@apollo/client";
import { apolloClient, theme } from "@lyricova/components";

export const themeMod = createTheme({
  ...theme,
  typography: {
    fontFamily:
      "var(--font-inter),var(--font-source-han-sans)," +
      theme.typography.fontFamily,
  },
  // @ts-expect-error version mismatch
  components: {
    ...theme.components,
    MuiCssBaseline: {
      ...theme.components?.MuiCssBaseline,
      styleOverrides: {
        ...(theme.components?.MuiCssBaseline?.styleOverrides as object),
        "body:lang(zh), body:lang(ja)": {
          fontFamily: `var(--font-source-han-sans-punct),var(--font-inter),var(--font-source-han-sans),${theme?.typography.fontFamily}`,
        },
      },
    },
  },
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={themeMod}>{children}</ThemeProvider>
    </ApolloProvider>
  );
}
