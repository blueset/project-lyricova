import { useRouter } from "next/router";
import { useAppContext } from "../AppContext";
import { useAuthContext } from "../AuthContext";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import React, { Fragment } from "react";
import {
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem
} from "@material-ui/core";
import { formatArtistsPlainText } from "../../../frontendUtils/artists";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import { MusicFile } from "../../../models/MusicFile";
import { Song } from "../../../models/Song";
import ListItemTextWithTime from "./ListItemTextWithTime";

interface Props {
  song: Song;
  file: MusicFile | null;
  files: MusicFile[]
}

export default function TrackListRow({song, file, files}: Props) {
  const router = useRouter();
  const { playlist } = useAppContext();
  const { user } = useAuthContext();
  const popupState = usePopupState({ variant: "popover", popupId: `single-track-menu-${song.id}` });
  const showTrackNumber = song.SongInAlbum !== undefined;

  const handlePlayNext = () => {
    playlist.addTrackToNext(file);
    popupState.close();
  };
  const handlePlayInList = () => {
    playlist.loadTracks(files);
    playlist.playTrack(files.indexOf(file));
    popupState.close();
  };
  const handleShowDetails = () => {
    router.push(`/info/${file?.id}`);
    popupState.close();
  };
  const handleEditMusicFileEntry = () => {
    window.open(`/dashboard/review/${file?.id}`, "_blank");
    popupState.close();
  };
  const handleEditSongEntry = () => {
    window.open(`/dashboard/songs/${song.id}`, "_blank");
    popupState.close();
  };

  return <Fragment key={song.id}>
    <ListItem disabled={file === null}>
      {showTrackNumber && <ListItemIcon>{song.SongInAlbum.trackNumber ?? "?"}</ListItemIcon>}
      <ListItemTextWithTime primary={song.name} secondary={formatArtistsPlainText(song.artists)} time={file?.duration ?? null}/>
      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          aria-label="Actions"
          {...bindTrigger(popupState)}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          id={`currentPlaylist-menu-${song.id}`}
          getContentAnchorEl={null}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          {...bindMenu(popupState)}
        >
          <MenuItem disabled={!file} onClick={handlePlayNext}>
            <ListItemText
              primary="Play next"
            />
          </MenuItem>
          <MenuItem disabled={!file} onClick={handlePlayInList}>
            <ListItemText
              primary="Play in the playlist"
            />
          </MenuItem>
          <MenuItem disabled={!file} onClick={handleShowDetails}>
            <ListItemText
              primary="Show details"
            />
          </MenuItem>
          {user && <MenuItem disabled={!file} onClick={handleEditMusicFileEntry}>
              <ListItemText
                  primary="Edit music file entry"
              />
          </MenuItem>}
          {user && <MenuItem onClick={handleEditSongEntry}>
              <ListItemText
                  primary="Edit song entity"
              />
          </MenuItem>}
        </Menu>
      </ListItemSecondaryAction>
    </ListItem>
    <Divider variant={showTrackNumber ? "inset" : "fullWidth"} component="li" />
  </Fragment>;
}