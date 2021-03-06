import { IconButton, PropTypes, Tooltip } from "@material-ui/core";
import { ComponentProps, ReactChild } from "react";

interface TooltipIconButtonProps {
  title: string;
  color?: PropTypes.Color;
  disabled?: boolean;
  "aria-label"?: string;
  onClick?: ComponentProps<typeof IconButton>["onClick"];
  children?: ReactChild;
}

export default function TooltipIconButton(props: TooltipIconButtonProps) {
  const iconButton = (
    <IconButton disabled={props.disabled} aria-label={props["aria-label"]} color={props.color}
                onClick={props.onClick}>
      {props.children}
    </IconButton>
  );

  if (props.disabled) {
    return iconButton;
  }

  return <Tooltip title={props.title}>
    {iconButton}
  </Tooltip>;
}