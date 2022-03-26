import { useRouter } from "next/router";
import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import { useAppContext } from "../../../components/public/AppContext";
import { useAuthContext } from "../../../components/public/AuthContext";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import { gql, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import _ from "lodash";
import { Box, Chip, IconButton, List, ListItemText, Menu, MenuItem, Stack, Typography } from "@mui/material";
import filesize from "filesize";
import ButtonRow from "../../../components/ButtonRow";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import TrackListRow from "../../../components/public/library/TrackListRow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import React from "react";
import { makeStyles } from "@mui/material/styles";
import { MusicFileFragments } from "../../../graphql/fragments";
import { Playlist } from "../../../models/Playlist";
import PlaylistAvatar from "../../../components/PlaylistAvatar";
import { DocumentNode } from "graphql";


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
` as DocumentNode;

export default function PlaylistDetails() {
  const router = useRouter();
  const slug = router.query.slug as string;
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
      <Stack direction="row" alignItems="center">
        <PlaylistAvatar name={playlistData.name} slug={playlistData.slug} sx={{
          marginRight: 1,
          height: "6rem",
          width: "6rem",
          fontSize: "3em",
        }} />
        <div style={{flexGrow: 1, width: 0}}>
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
      </Stack>
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
    <Box sx={{marginTop: 2, marginBottom: 2, marginLeft: 4, marginRight: 4,}}>
      <Chip label="Playlists" icon={<ArrowBackIcon />} clickable size="small"
            sx={{ marginTop: 2, marginBottom: 2, textTransform: "capitalize", }}
            onClick={() => router.push("/library/playlists")} />
      {content}
    </Box>
  );
}

PlaylistDetails.layout = getLayout;