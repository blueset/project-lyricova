"use client";

import React from "react";
import theme from "lyricova-common/frontendUtils/theme";
import { Providers } from "./Providers";

export const metadata = {
  title: "Lyricova Jukebox",
  viewport: { width: "device-width", initialScale: 1, minimumScale: 1 },
  themeColor: theme.palette.primary.main,
};

export default function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
