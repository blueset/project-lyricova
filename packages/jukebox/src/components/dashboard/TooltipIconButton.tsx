import { IconButton, PropTypes, Theme, Tooltip } from "@mui/material";
import { ComponentProps, ReactChild } from "react";
import { SxProps } from "@mui/system";

interface TooltipIconButtonProps {
  title: string;
  color?: PropTypes.Color;
  disabled?: boolean;
  "aria-label"?: string;
  onClick?: ComponentProps<typeof IconButton>["onClick"];
  children?: ReactChild;
  sx?: SxProps<Theme>;
}

export default function TooltipIconButton(props: TooltipIconButtonProps) {
  const iconButton = (
    <IconButton disabled={props.disabled} aria-label={props["aria-label"]}
                color={props.color} onClick={props.onClick} sx={props.sx}>
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