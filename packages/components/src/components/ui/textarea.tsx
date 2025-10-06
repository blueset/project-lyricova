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
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
