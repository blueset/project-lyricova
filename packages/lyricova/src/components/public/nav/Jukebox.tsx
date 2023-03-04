import { IconButton, Tooltip } from "@mui/material";
import { jukeboxUrl } from "../../../utils/consts";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";

export function Jukebox() {
  return (
    <Tooltip title="Jukebox">
      <IconButton LinkComponent="a" href={jukeboxUrl}>
        <LibraryMusicIcon />
      </IconButton>
    </Tooltip>
  );
}
