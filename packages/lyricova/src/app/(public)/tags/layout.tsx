import * as React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <style>{"html, body { height: 100%; }"}</style>
    </>
  );
}
