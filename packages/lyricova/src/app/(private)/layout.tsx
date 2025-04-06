import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import {
  MonaSans,
  HubotSans,
  SourceHanSans,
  SourceHanSansPunct,
} from "@/fonts";
import clsx from "clsx";
import "../../styles/global.scss";
import * as React from "react";
import type { Metadata, Viewport } from "next";
import { palette } from "@lyricova/components";
import { ClientProviders } from "./clientProvider";

export const viewport: Viewport = {
  themeColor: palette.primary.main,
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
};

export const metadata: Metadata = {
  title: "Project Lyricova",
  appleWebApp: {
    title: "Project Lyricova",
  },
  applicationName: "Project Lyricova",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={clsx(
          MonaSans.variable,
          HubotSans.variable,
          SourceHanSans.variable,
          SourceHanSansPunct.variable
        )}
      >
        <InitColorSchemeScript attribute="class" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ClientProviders>
            <CssBaseline />
            {children}
          </ClientProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
