import { useRouter } from "next/router";
import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import { useAuthContext } from "lyricova-common/components/AuthContext";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { gql, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import _ from "lodash";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  List,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import filesize from "filesize";
import ButtonRow from "../../../components/ButtonRow";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import TrackListRow from "../../../components/public/library/TrackListRow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import React from "react";
import { MusicFileFragments } from "lyricova-common/utils/fragments";
import type { Playlist } from "lyricova-common/models/Playlist";
import PlaylistAvatar, { gradients } from "../../../components/PlaylistAvatar";
import type { DocumentNode } from "graphql";
import { useAppDispatch } from "../../../redux/public/store";
import {
  addTrackToNext,
  loadTracks,
  playTrack,
  toggleShuffle,
} from "../../../redux/public/playlist";
import type { MusicFile } from "lyricova-common/models/MusicFile";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocalPlayIcon from "@mui/icons-material/LocalPlay";
import WhatshotIcon from "@mui/icons-material/Whatshot";

const PLAYLIST_DETAILS_QUERY = gql`
  query ($slug: String!) {
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

const NEW_QUERY = gql`
  query {
    newMusicFiles {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

const RECENT_QUERY = gql`
  query {
    recentMusicFiles {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

const POPULAR_QUERY = gql`
  query {
    popularMusicFiles(limit: 100) {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

export default function PlaylistDetails() {
  const router = useRouter();
  const slug = router.query.slug as string;
  const { user } = useAuthContext();
  const popupState = usePopupState({
    variant: "popover",
    popupId: "single-artist-overflow-menu",
  });
  const dispatch = useAppDispatch();

  const isPredefined =
    slug === "new" || slug === "recent" || slug === "popular";

  const query = useQuery<{
    playlist?: Playlist;
    newMusicFiles?: MusicFile[];
    recentMusicFiles?: MusicFile[];
    popularMusicFiles?: MusicFile[];
  }>(
    slug === "new"
      ? NEW_QUERY
      : slug === "recent"
      ? RECENT_QUERY
      : slug === "popular"
      ? POPULAR_QUERY
      : PLAYLIST_DETAILS_QUERY,
    {
      variables: !isPredefined ? { slug } : undefined,
    }
  );

  let content;

  if (query.loading) content = <Alert severity="info">Loading...</Alert>;
  else if (query.error)
    content = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data.playlist === null)
    content = (
      <Alert severity="error">Error: Playlist #{slug} was not found.</Alert>
    );
  else {
    const playlistData = query.data.playlist;
    const files =
      playlistData?.files ??
      query.data.newMusicFiles ??
      query.data.recentMusicFiles ??
      query.data.popularMusicFiles;
    const trackCount = files.length;
    const totalMinutes = Math.round(_.sumBy(files, "duration") / 60);
    const totalSize = _.sumBy(files, "fileSize");
    const canPlay = trackCount > 0;
    const name =
      slug === "new"
        ? "Recently Added"
        : slug === "recent"
        ? "Recently Played"
        : slug === "popular"
        ? "Most Played"
        : playlistData?.name;
    const displaySlug =
      slug === "new"
        ? "Track added in 30 days"
        : slug === "recent"
        ? "Track played in 30 days"
        : slug === "popular"
        ? "Most played tracks"
        : playlistData?.slug;

    const playAll = () => dispatch(loadTracks(files));
    const shuffleAll = () => {
      playAll();
      dispatch(toggleShuffle());
    };

    content = (
      <>
        <Stack direction="row" alignItems="center">
          {playlistData ? (
            <PlaylistAvatar
              name={name}
              slug={displaySlug}
              sx={{
                marginRight: 1,
                height: "6rem",
                width: "6rem",
                fontSize: "3em",
              }}
            />
          ) : (
            <Avatar
              variant="rounded"
              sx={{
                height: "6rem",
                width: "6rem",
                marginRight: 1,
                fontSize: "3em",
                color: "white",
                backgroundImage: `linear-gradient(225deg, ${gradients[
                  slug === "new"
                    ? 1
                    : slug === "recent"
                    ? 2
                    : slug === "popular"
                    ? 3
                    : 4
                ].colors.join(", ")})`,
              }}
            >
              {slug === "new" ? (
                <AutoAwesomeIcon fontSize="inherit" />
              ) : slug === "recent" ? (
                <LocalPlayIcon fontSize="inherit" />
              ) : slug === "popular" ? (
                <WhatshotIcon fontSize="inherit" />
              ) : null}
            </Avatar>
          )}
          <div style={{ flexGrow: 1, width: 0 }}>
            <Typography variant="h6">{name}</Typography>
            <Typography variant="body2" color="textSecondary">
              {displaySlug}: {trackCount} {trackCount < 2 ? "song" : "songs"},{" "}
              {totalMinutes} {totalMinutes < 2 ? "minute" : "minutes"},{" "}
              {filesize(totalSize)}
            </Typography>
          </div>
          <ButtonRow>
            {canPlay && (
              <Chip
                icon={<PlaylistPlayIcon />}
                label="Play"
                clickable
                onClick={playAll}
              />
            )}
            {canPlay && (
              <Chip
                icon={<ShuffleIcon />}
                label="Shuffle"
                clickable
                onClick={shuffleAll}
              />
            )}
            <IconButton {...bindTrigger(popupState)}>
              <MoreVertIcon />
            </IconButton>
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
              <MenuItem
                disabled={!user}
                onClick={() => {
                  window.open(`/dashboard/playlists/${playlistData.slug}`);
                  popupState.close();
                }}
              >
                <ListItemText primary="Edit playlist entity" />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  window.open(
                    `/api/playlists/${playlistData.slug}.m3u8`,
                    "_blank"
                  );
                  popupState.close();
                }}
              >
                <ListItemText primary="Download playlist M3U8" />
              </MenuItem>
            </Menu>
          </ButtonRow>
        </Stack>
        <List>
          {files.map((v) => (
            <TrackListRow
              song={null}
              file={v}
              files={files}
              key={v.id}
              showAlbum
            />
          ))}
        </List>
      </>
    );
  }

  return (
    <Box sx={{ marginTop: 2, marginBottom: 2, marginLeft: 4, marginRight: 4 }}>
      <Chip
        label="Playlists"
        icon={<ArrowBackIcon />}
        clickable
        size="small"
        sx={{ marginTop: 2, marginBottom: 2, textTransform: "capitalize" }}
        onClick={() => router.push("/library/playlists")}
      />
      {content}
    </Box>
  );
}

PlaylistDetails.layout = getLayout;
