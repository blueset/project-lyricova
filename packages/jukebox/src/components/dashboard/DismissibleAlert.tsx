import type { AlertProps } from "@mui/material";
import { Alert } from "@mui/material";
import type { CollapseProps } from "@mui/material";
import { Collapse } from "@mui/material";
import { useState } from "react";

interface Props extends AlertProps {
  collapseProps?: CollapseProps;
}

export default function DismissibleAlert(props: Props) {
  const [open, toggle] = useState(true);
  const {collapseProps, ...otherProps} = props;
  return (
    <Collapse {...collapseProps} in={open}>
      <Alert
        {...otherProps}
        onClose={() => toggle(false)}
      />
    </Collapse>
  );
}