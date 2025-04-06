"use client";

import { resizeVerse } from "@/utils/sizing";
import { HTMLAttributes } from "react";

export function VerseResizer({
  children,
  ...props
}: { children: React.ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      ref={(elm) => {
        if (elm) {
          document.fonts.ready.then(() => {
            resizeVerse(elm);
          });
        }
      }}
    >
      {children}
    </div>
  );
}
