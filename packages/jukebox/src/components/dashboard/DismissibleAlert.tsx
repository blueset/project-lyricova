import { Alert, AlertProps } from "@material-ui/lab";
import { Collapse, CollapseProps } from "@material-ui/core";
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