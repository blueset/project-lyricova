"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const PresentationWindowContext = createContext<Window | null>(null);

export function PresentationWindowProvider({
  value,
  children,
}: {
  value: Window | null;
  children: ReactNode;
}) {
  return (
    <PresentationWindowContext.Provider value={value}>
      {children}
    </PresentationWindowContext.Provider>
  );
}

export function usePresentationWindow(): Window | null {
  const presentationWindow = useContext(PresentationWindowContext);
  if (presentationWindow) return presentationWindow;
  return typeof window === "undefined" ? null : window;
}
