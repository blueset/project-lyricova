import {
  MonaSans,
  HubotSans,
  SourceHanSans,
  SourceHanSansPunct,
} from "@/fonts";
import clsx from "clsx";
import * as React from "react";
import type { Metadata, Viewport } from "next";
import { palette, TelemetryProvider } from "@lyricova/components";
import { siteName } from "@/utils/consts";
import "../../styles/global.scss";
import "@lyricova/components/styles/tailwindGlobal.css";

export const viewport: Viewport = {
  themeColor: palette.primary.main,
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
};

export const metadata: Metadata = {
  title: {
    template: `%s – ${siteName}`,
    default: siteName,
  },
  appleWebApp: {
    title: siteName,
  },
  applicationName: siteName,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={clsx(
          "dark",
          "wrapper",
          MonaSans.variable,
          HubotSans.variable,
          SourceHanSans.variable,
          SourceHanSansPunct.variable
        )}
      >
        <TelemetryProvider
          clarityProjectId={process.env.NEXT_PUBLIC_CLARITY_ID}
          postHogKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
          postHogHost={process.env.NEXT_PUBLIC_POSTHOG_HOST}
        >
          {children}
        </TelemetryProvider>
      </body>
    </html>
  );
}
