import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import { Link } from "../Link";

export function Search() {
  return (
    <Tooltip title="Search">
      <IconButton LinkComponent={Link} href="/search" data-nav-icon="search">
        <SearchIcon />
      </IconButton>
    </Tooltip>
  );
}
