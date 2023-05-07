import type { ListItemTextProps } from "@mui/material";
import { Box, ListItemText, Typography } from "@mui/material";
import * as React from "react";
import { formatTime } from "../../../frontendUtils/strings";

interface Props extends ListItemTextProps {
  time: number | null;
}

export default function ListItemTextWithTime({
  primary,
  secondary,
  time,
  primaryTypographyProps,
  secondaryTypographyProps,
}: Props) {
  let timeStr: string = null;
  if (time !== null) {
    timeStr = formatTime(time);
  }

  return (
    <ListItemText
      sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      disableTypography
    >
      <Box sx={{ flexGrow: 1, width: 0, marginRight: 1 }}>
        <Typography variant="body1" lang="ja" {...primaryTypographyProps}>
          {primary}
        </Typography>
        <Typography
          variant="body2"
          color="textSecondary"
          lang="ja"
          {...secondaryTypographyProps}
        >
          {secondary}
        </Typography>
      </Box>
      {timeStr !== null && (
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ marginRight: 1 }}
        >
          {timeStr}
        </Typography>
      )}
    </ListItemText>
  );
}
