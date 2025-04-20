import { siteName } from "@/utils/consts";
import * as React from "react";

export const metadata = {
  title: {
    template: `%s – Screensavers – ${siteName}`,
    default: `Screensavers – ${siteName}`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <style>{"html, body { height: 100%; }"}</style>
    </>
  );
}
