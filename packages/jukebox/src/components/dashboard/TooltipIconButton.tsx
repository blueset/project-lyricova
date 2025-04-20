import { Button } from "@lyricova/components/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import type { ComponentProps, ReactNode } from "react";

interface TooltipIconButtonProps
  extends Omit<ComponentProps<typeof Button>, "title"> {
  title: ReactNode;
}

export default function TooltipIconButton({
  title,
  ...props
}: TooltipIconButtonProps) {
  const iconButton = (
    <Button variant="ghost" size="icon" {...props}>
      {props.children}
    </Button>
  );

  if (props.disabled) {
    return iconButton;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{iconButton}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
