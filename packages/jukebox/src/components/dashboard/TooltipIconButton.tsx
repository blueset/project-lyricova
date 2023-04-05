import type { PropTypes, Theme} from "@mui/material";
import { IconButton, Tooltip } from "@mui/material";
import type { ComponentProps, ReactNode } from "react";
import type { SxProps } from "@mui/system";

interface TooltipIconButtonProps {
  title: string;
  color?: PropTypes.Color;
  disabled?: boolean;
  "aria-label"?: string;
  onClick?: ComponentProps<typeof IconButton>["onClick"];
  children?: ReactNode;
  sx?: SxProps<Theme>;
}

export default function TooltipIconButton(props: TooltipIconButtonProps) {
  const iconButton = (
    <IconButton
      disabled={props.disabled}
      aria-label={props["aria-label"]}
      color={props.color}
      onClick={props.onClick}
      sx={props.sx}
    >
      {props.children}
    </IconButton>
  );

  if (props.disabled) {
    return iconButton;
  }

  return <Tooltip title={props.title}>{iconButton}</Tooltip>;
}
