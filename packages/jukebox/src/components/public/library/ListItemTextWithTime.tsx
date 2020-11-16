import { ListItemText, ListItemTextProps, Typography } from "@material-ui/core";
import { ElementType, ReactNode } from "react";
import { makeStyles } from "@material-ui/core/styles";
import _ from "lodash";
import * as React from "react";
import { formatTime } from "../../../frontendUtils/strings";

interface Props extends ListItemTextProps {
  time: number | null;
}

const useStyles = makeStyles((theme) => ({
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  texts: {
    flexGrow: 1,
    width: 0,
    marginRight: theme.spacing(1),
  },
  time: {
    marginRight: theme.spacing(1),
  }
}));

export default function ListItemTextWithTime({primary, secondary, time, primaryTypographyProps, secondaryTypographyProps}: Props) {
  const styles = useStyles();

  let timeStr: string = null;
  if (time !== null) {
    timeStr = formatTime(time);
  }

  return (
    <ListItemText className={styles.row} disableTypography>
      <div className={styles.texts}>
        <Typography variant="body1" {...primaryTypographyProps}>{primary}</Typography>
        <Typography variant="body2" color="textSecondary" {...secondaryTypographyProps}>{secondary}</Typography>
      </div>
      {timeStr !== null && <Typography variant="body2" color="textSecondary" className={styles.time}>{timeStr}</Typography>}
    </ListItemText>
  );
}