import * as React from "react";
import { cn } from "@lyricova/components/utils";
import { formatTime } from "../../../frontendUtils/strings";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  time: number | null;
  primaryTypographyProps?: React.HTMLAttributes<HTMLParagraphElement>;
  secondaryTypographyProps?: React.HTMLAttributes<HTMLParagraphElement>;
  className?: string;
}

export default function ListItemTextWithTime({
  primary,
  secondary,
  time,
  primaryTypographyProps,
  secondaryTypographyProps,
  className,
  ...props
}: Props) {
  let timeStr: string = null;
  if (time !== null) {
    timeStr = formatTime(time);
  }

  return (
    <div
      className={cn("flex flex-row items-center grow", className)}
      {...props}
    >
      <div className="flex-grow w-0 mr-1">
        <p className="text-base truncate" lang="ja" {...primaryTypographyProps}>
          {primary}
        </p>
        {secondary && (
          <p
            className="text-sm text-muted-foreground truncate"
            lang="ja"
            {...secondaryTypographyProps}
          >
            {secondary}
          </p>
        )}
      </div>
      {timeStr !== null && (
        <p className="text-sm text-muted-foreground mr-1 tabular-nums">
          {timeStr}
        </p>
      )}
    </div>
  );
}
