import { useRouter } from "next/router";
import { useAuthContext } from "../AuthContext";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import React, { Fragment } from "react";
import {
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { formatArtistsPlainText } from "../../../frontendUtils/artists";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { MusicFile } from "lyricova-common/models/MusicFile";
import { Song } from "lyricova-common/models/Song";
import ListItemTextWithTime from "./ListItemTextWithTime";
import {
  playTrack,
  addTrackToNext,
  loadTracks,
} from "../../../redux/public/playlist";
import { useAppDispatch } from "../../../redux/public/store";

interface Props {
  song: Song | null;
  file: MusicFile | null;
  files: MusicFile[];
  showAlbum?: boolean;
}

export default function TrackListRow({ song, file, files, showAlbum }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const dispatch = useAppDispatch();
  const id = song ? song.id : file.id;
  const popupState = usePopupState({
    variant: "popover",
    popupId: `single-track-menu-${id}`,
  });
  const showTrackNumber = song && song.SongInAlbum !== undefined;

  const handlePlayNext = () => {
    dispatch(addTrackToNext(file));
    popupState.close();
  };
  const handlePlayInList = () => {
    dispatch(loadTracks(files));
    dispatch(playTrack({ track: files.indexOf(file), playNow: true }));
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
    window.open(`/dashboard/songs/${song?.id}`, "_blank");
    popupState.close();
  };

  return (
    <Fragment key={id}>
      <ListItem disabled={file === null}>
        {showTrackNumber && (
          <ListItemIcon>{song?.SongInAlbum.trackNumber ?? "?"}</ListItemIcon>
        )}
        <ListItemTextWithTime
          primary={song ? song.name : file.trackName}
          secondary={
            <>
              {(song
                ? formatArtistsPlainText(song.artists)
                : file.artistName) || <em>Various Artists</em>}
              {showAlbum && file && (
                <>
                  {" / "}
                  {(file.album?.name ?? file.albumName) || (
                    <em>Unknown album</em>
                  )}
                </>
              )}
            </>
          }
          time={file?.duration ?? null}
        />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            aria-label="Actions"
            {...bindTrigger(popupState)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id={`currentPlaylist-menu-${id}`}
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
              <ListItemText primary="Play next" />
            </MenuItem>
            <MenuItem disabled={!file} onClick={handlePlayInList}>
              <ListItemText primary="Play in the playlist" />
            </MenuItem>
            <MenuItem disabled={!file} onClick={handleShowDetails}>
              <ListItemText primary="Show details" />
            </MenuItem>
            {user && (
              <MenuItem disabled={!file} onClick={handleEditMusicFileEntry}>
                <ListItemText primary="Edit music file entry" />
              </MenuItem>
            )}
            {user && (
              <MenuItem disabled={!song} onClick={handleEditSongEntry}>
                <ListItemText primary="Edit song entity" />
              </MenuItem>
            )}
          </Menu>
        </ListItemSecondaryAction>
      </ListItem>
      <Divider
        variant={showTrackNumber ? "inset" : "fullWidth"}
        component="li"
      />
    </Fragment>
  );
}
