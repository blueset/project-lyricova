import clsx from "clsx";
import classes from "./Divider.module.scss";

interface DividerProps {
  vertical?: boolean;
}

export function Divider({ vertical }: DividerProps) {
  return (
    <div
      className={clsx(classes.divider, vertical && classes.verticalDivider)}
    />
  );
}
