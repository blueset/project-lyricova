import { IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { NextComposedLink } from "lyricova-common/components/Link";

export function Search() {
  return (
    <Tooltip title="Search">
      <IconButton LinkComponent={NextComposedLink} href="/search">
        <SearchIcon />
      </IconButton>
    </Tooltip>
  );
}
