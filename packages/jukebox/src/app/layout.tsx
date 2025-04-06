import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import type { Metadata, Viewport } from "next";
import { ClientProviders } from "./clientProviders";
import { palette } from "@lyricova/components";

export const viewport: Viewport = {
  themeColor: palette.primary.main,
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
};

export const metadata: Metadata = {
  title: "Lyricova Jukebox",
  appleWebApp: {
    title: "Lyricova Jukebox",
  },
  applicationName: "Lyricova Jukebox",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="class" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ClientProviders>
            {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
            <CssBaseline />
            {props.children}
          </ClientProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
