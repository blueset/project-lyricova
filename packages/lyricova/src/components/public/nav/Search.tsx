import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import { NextComposedLink } from "lyricova-common/components/Link";

export function Search() {
  return (
    <Tooltip title="Search">
      <IconButton
        LinkComponent={NextComposedLink}
        href="/search"
        data-nav-icon="search"
      >
        <SearchIcon />
      </IconButton>
    </Tooltip>
  );
}
