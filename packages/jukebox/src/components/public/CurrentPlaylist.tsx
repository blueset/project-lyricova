import style from "./CurrentPlaylist.module.scss";
import { useAppContext, Track } from "./AppContext";
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  ListItemIcon,
  Typography,
} from "@material-ui/core";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import DragHandleIcon from "@material-ui/icons/DragHandle";
import { useMemo } from "react";

export default function CurrentPlaylist() {
  const { playlist } = useAppContext();
  const tracks: Track[] = useMemo(() => {
    if (!playlist.shuffleMapping) {
      return playlist.tracks;
    } else {
      console.log("Shuffle mapping is rendered");
      return playlist.shuffleMapping.map((v) => playlist.tracks[v]);
    }
  }, [playlist.shuffleMapping, playlist.tracks]);
  return (
    <List dense={true} className={style.playlist}>
      {tracks.map((value, index) => (
        <ListItem
          button
          key={value.id}
          style={{
            opacity: index < playlist.nowPlaying ? 0.375 : 1,
          }}
          selected={playlist.nowPlaying === index}
          onClick={() => {
            playlist.playTrack(index, true);
          }}
        >
          <ListItemIcon>
            <DragHandleIcon />
          </ListItemIcon>
          <ListItemText
            primary={`#${index}: ${value.trackName}`}
            primaryTypographyProps={{ noWrap: true }}
            secondary={value.artistName}
            secondaryTypographyProps={{ noWrap: true }}
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" aria-label="More actions">
              <MoreVertIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
}
