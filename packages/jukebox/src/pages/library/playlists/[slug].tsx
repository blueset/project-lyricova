import { useRouter } from "next/router";
import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import { useAppContext } from "../../../components/public/AppContext";
import { useAuthContext } from "../../../components/public/AuthContext";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import { gql, useQuery } from "@apollo/client";
import { Alert } from "@material-ui/lab";
import _ from "lodash";
import { Chip, IconButton, List, ListItemText, Menu, MenuItem, Typography } from "@material-ui/core";
import filesize from "filesize";
import ButtonRow from "../../../components/ButtonRow";
import PlaylistPlayIcon from "@material-ui/icons/PlaylistPlay";
import ShuffleIcon from "@material-ui/icons/Shuffle";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import TrackListRow from "../../../components/public/library/TrackListRow";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { MusicFileFragments } from "../../../graphql/fragments";
import { Playlist } from "../../../models/Playlist";
import PlaylistAvatar from "../../../components/PlaylistAvatar";


const PLAYLIST_DETAILS_QUERY = gql`
  query($slug: String!) {
    playlist(slug: $slug) {
      slug
      name

      files {
        ...MusicFileForPlaylistAttributes
        FileInPlaylist {
          sortOrder
        }
      }
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
`;

const useStyles = makeStyles((theme) => ({
  navigationRow: {
    margin: theme.spacing(2, 0),
    textTransform: "capitalize",
  },
  cover: {
    marginRight: theme.spacing(1),
    height: "6rem",
    width: "6rem",
    fontSize: "3em",
  },
  container: {
    margin: theme.spacing(2, 4),
  },
  metaRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    flexGrow: 1,
    width: 0,
  }
}));

export default function PlaylistDetails() {
  const router = useRouter();
  const slug = router.query.slug as string;
  const styles = useStyles();
  const { playlist } = useAppContext();
  const { user } = useAuthContext();
  const popupState = usePopupState({ variant: "popover", popupId: "single-artist-overflow-menu" });

  const query = useQuery<{playlist: Playlist}>(PLAYLIST_DETAILS_QUERY, {variables: {slug}});
  let content;

  if (query.loading) content = <Alert severity="info">Loading...</Alert>;
  else if (query.error) content = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data.playlist === null) content = <Alert severity="error">Error: Playlist #{slug} was not found.</Alert>;
  else {
    const playlistData = query.data.playlist;
    const files = playlistData.files;
    const trackCount = files.length;
    const totalMinutes = Math.round(_.sumBy(files, "duration") / 60);
    const totalSize = _.sumBy(files, "fileSize");
    const canPlay = trackCount > 0;

    const playAll = () => playlist.loadTracks(files);
    const shuffleAll = () => {
      playAll();
      playlist.toggleShuffle();
    };

    content = <>
      <div className={styles.metaRow}>
        <PlaylistAvatar name={playlistData.name} slug={playlistData.slug} className={styles.cover} />
        <div className={styles.metaText}>
          <Typography variant="h6">{playlistData.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            {playlistData.slug}{": "}
            {trackCount} {trackCount < 2 ? "song" : "songs"}, {totalMinutes} {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
          </Typography>
        </div>
        <ButtonRow>
          {canPlay && <Chip icon={<PlaylistPlayIcon />} label="Play" clickable onClick={playAll} />}
          {canPlay && <Chip icon={<ShuffleIcon />} label="Shuffle" clickable onClick={shuffleAll} />}
          <IconButton {...bindTrigger(popupState)}><MoreVertIcon /></IconButton>
          <Menu
            id={"single-album-overflow-menu"}
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
            <MenuItem disabled={!user} onClick={() => {
              window.open(`/dashboard/playlists/${playlistData.slug}`);
              popupState.close();
            }}>
              <ListItemText
                primary="Edit playlist entity"
              />
            </MenuItem>
            <MenuItem onClick={() => {
              window.open(`/api/playlists/${playlistData.slug}.m3u8`, "_blank");
              popupState.close();
            }}>
              <ListItemText
                primary="Download playlist M3U8"
              />
            </MenuItem>
          </Menu>
        </ButtonRow>
      </div>
      <List>
        {
          _.sortBy(files, v => v.FileInPlaylist.sortOrder).map(v =>
            <TrackListRow song={null} file={v} files={files} key={v.id} showAlbum />
          )
        }
      </List>
    </>;
  }

  return (
    <div className={styles.container}>
      <Chip label="Playlists" icon={<ArrowBackIcon />} clickable size="small" className={styles.navigationRow}
            onClick={() => router.push("/library/playlists")} />
      {content}
    </div>
  );
}

PlaylistDetails.layout = getLayout;