import { IconButton, Tooltip } from "@mui/material";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import { Link } from "../Link";

export function Screensavers() {
  return (
    <Tooltip title="Screensavers">
      <IconButton
        LinkComponent={Link}
        href="/screensavers"
        data-nav-icon="screensavers"
      >
        <AspectRatioIcon />
      </IconButton>
    </Tooltip>
  );
}
