import * as React from "react";
import { Button } from "@lyricova/components/components/ui/button";

import { cn } from "@lyricova/components/utils";

function ProgressButton({
  className,
  children,
  progress = false,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & {
  progress?: boolean | number;
}) {
  return (
    <Button
      data-slot="button"
      className={cn("relative overflow-hidden", className)}
      disabled={disabled || progress !== false}
      {...props}
    >
      <div className="z-10 inline-flex items-center justify-center gap-2">
        {children}
      </div>
      {typeof progress === "number" && (
        <div
          className="absolute bg-gradient-to-r from-info-foreground/0 to-info-foreground/20 z-0 top-0 left-0 bottom-0 border-r-[0.5px] border-info-foreground"
          style={{ width: `${progress}%` }}
        />
      )}
      {progress === true && (
        <div className="absolute bg-gradient-to-r from-info-foreground/0 to-info-foreground/20 z-0 top-0 left-0 bottom-0 border-r-[0.5px] border-info-foreground animate-indefinite-progress w-12" />
      )}
    </Button>
  );
}

export { ProgressButton };
