"use client";

import { ThemeProvider } from "@mui/material";
import { theme } from "@lyricova/components";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
