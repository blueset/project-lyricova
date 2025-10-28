import * as React from "react";
import type { Metadata, Viewport } from "next";
import { ClientProviders } from "./clientProviders";
import { palette } from "@lyricova/components";
import {
  Inter,
  SourceHanSans,
  SourceHanSansPunct,
  SourceHanSerif,
} from "@/fonts";
import clsx from "clsx";
import "@lyricova/components/styles/tailwindGlobal.css";

export const viewport: Viewport = {
  themeColor: palette.primary.main,
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
};

export const metadata: Metadata = {
  title: {
    template: "%s – Lyricova Jukebox",
    default: "Lyricova Jukebox",
  },
  appleWebApp: {
    title: "Lyricova Jukebox",
  },
  applicationName: "Lyricova Jukebox",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={clsx(
          "dark",
          Inter.variable,
          SourceHanSans.variable,
          SourceHanSansPunct.variable,
          SourceHanSerif.variable
        )}
      >
        <ClientProviders>{props.children}</ClientProviders>
      </body>
    </html>
  );
}
