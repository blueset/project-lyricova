import { makeStyles } from "@material-ui/core/styles";
import { Children, cloneElement, isValidElement, ReactNode } from "react";
import clsx from "clsx";

const useStyles = makeStyles((theme) => ({
  row: {
    margin: theme.spacing(1, 0),
  },
  button: {
    marginRight: theme.spacing(1),
    "&:last-child": {
      marginRight: 0,
    },
  }
}));

interface Props {
  children: ReactNode;
  className?: string;
}

export default function ButtonRow({ children, className }: Props) {
  const styles = useStyles();

  return (
    <div className={clsx(styles.row, className)}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) {
          return null;
        }

        return cloneElement(child, {
          className: clsx(styles.button, child.props.className),
        });
      })}
    </div>
  );
}