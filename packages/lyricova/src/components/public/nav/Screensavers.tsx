import { IconButton, Tooltip } from "@mui/material";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import { NextComposedLink } from "lyricova-common/components/Link";

export function Screensavers() {
  return (
    <Tooltip title="Screensavers">
      <IconButton
        LinkComponent={NextComposedLink}
        href="/screensaver"
        data-nav-icon="screensavers"
      >
        <AspectRatioIcon />
      </IconButton>
    </Tooltip>
  );
}
