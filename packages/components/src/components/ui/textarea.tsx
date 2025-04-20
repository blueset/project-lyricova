"use client";

import * as React from "react";
import { cn } from "@lyricova/components/utils";
import { mergeRefs } from "react-merge-refs";

const supportsFieldSizing = globalThis?.CSS?.supports(
  "field-sizing",
  "content"
);

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    autoResize?: boolean;
  }
>(({ className, autoResize, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    if (autoResize && !supportsFieldSizing) {
      const textarea = textareaRef.current;
      function adjustHeight() {
        if (textarea) {
          textarea.style.height = "inherit";
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      }
      if (textarea) {
        textarea.style.overflow = "hidden";
        textarea.addEventListener("change", adjustHeight);
        adjustHeight();
        return () => {
          textarea.style.overflow = "";
          textarea.removeEventListener("change", adjustHeight);
        };
      }
    }
  }, [autoResize]);
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
        autoResize && supportsFieldSizing && "field-sizing-content",
        className
      )}
      ref={mergeRefs([ref, textareaRef])}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
