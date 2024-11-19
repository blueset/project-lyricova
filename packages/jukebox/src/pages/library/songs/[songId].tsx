import { useRouter } from "next/router";
import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Grid2 as Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { gql, useQuery } from "@apollo/client";
import {
  AlbumFragments,
  MusicFileFragments,
  SongFragments,
} from "lyricova-common/utils/fragments";
import Alert from "@mui/material/Alert";
import React, { Fragment } from "react";
import type { Album } from "lyricova-common/models/Album";
import _ from "lodash";
import filesize from "filesize";
import type { Song } from "lyricova-common/models/Song";
import ButtonRow from "../../../components/ButtonRow";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { formatArtists } from "lyricova-common/frontendUtils/artists";
import Link, { NextComposedLink } from "lyricova-common/components/Link";
import { useAuthContext } from "lyricova-common/components/AuthContext";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import type { MusicFile } from "lyricova-common/models/MusicFile";
import TrackListRow from "../../../components/public/library/TrackListRow";
import type { DocumentNode } from "graphql";
import { useAppDispatch } from "../../../redux/public/store";
import {
  loadTracks,
  playTrack,
  toggleShuffle,
} from "../../../redux/public/playlist";

const SONG_QUERY = gql`
  query ($id: Int!) {
    song(id: $id) {
      files {
        ...MusicFileForPlaylistAttributes
        duration
        fileSize
        songId
      }
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

type ConvertedTrack = Song & {
  foundFile: MusicFile | null;
};

export default function LibrarySingleSong() {
  const router = useRouter();
  const { user } = useAuthContext();
  const songId = parseInt(router.query.songId as string);
  const popupState = usePopupState({
    variant: "popover",
    popupId: "single-album-overflow-menu",
  });
  const dispatch = useAppDispatch();

  const query = useQuery<{ song: Song }>(SONG_QUERY, {
    variables: { id: songId },
  });

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error)
    return <Alert severity="error">Error: {`${query.error}`}</Alert>;
  if (!query.data?.song)
    return <Alert severity="warning">Song ID {songId} not found</Alert>;

  const song = query.data.song;
  const filesCount = song.files.length;
  const totalMinutes = Math.round(_.sumBy(song.files, "duration") / 60);
  const totalSize = _.sumBy(song.files, "fileSize");
  const canPlay = filesCount > 0;

  const files = song.files;

  const playAll = () => {
    dispatch(loadTracks(files));
    dispatch(playTrack({ track: 0, playNow: true }));
  };
  const shuffleAll = () => {
    dispatch(loadTracks(files));
    dispatch(toggleShuffle());
    dispatch(playTrack({ track: 0, playNow: true }));
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Grid container sx={{ marginTop: 2 }}>
        <Grid size={{ md: 4, xs: 12 }}>
          <Box
            sx={{
              position: { md: "sticky" },
              top: { md: 2 },
              marginBottom: 4,
            }}
          >
            {song.coverUrl && (
              <Avatar
                variant="rounded"
                src={song.coverUrl}
                sx={{
                  width: "calc(100% - 16px)",
                  paddingTop: "calc(100% - 16px)",
                  height: 0,
                  overflow: "hidden",
                  position: "relative",
                  marginBottom: 2,
                  "& > img": {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                  },
                }}
              />
            )}
          </Box>
        </Grid>
        <Grid size={{ md: 8, xs: 12 }}>
          <Box ml={2}>
            <Typography variant="h5" lang="ja">
              {song.name}
            </Typography>
            <Typography variant="h6" color="textSecondary" lang="ja">
              {formatArtists(song.artists, (v, isProd) =>
                v.map((artist, idx) => (
                  <Fragment key={artist.id}>
                    {idx > 0 && ", "}
                    <Link
                      href={`/library/${isProd ? "producers" : "vocalists"}/${
                        artist.id
                      }`}
                    >
                      {artist.name}
                    </Link>
                  </Fragment>
                ))
              )}
            </Typography>
            <Stack direction="row" alignItems="center" sx={{ marginRight: 1 }}>
              <ButtonRow sx={{ flexGrow: 1 }}>
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
                {song.id >= 0 && (
                  <Chip
                    icon={<FindInPageIcon />}
                    label="VocaDB"
                    clickable
                    onClick={() =>
                      window.open(`https://vocadb.net/S/${song.id}`, "_blank")
                    }
                  />
                )}
              </ButtonRow>
              <IconButton {...bindTrigger(popupState)}>
                <MoreVertIcon />
              </IconButton>
              <Menu
                id={"single-song-overflow-menu"}
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
                    window.open(`/dashboard/songs/${song.id}`);
                    popupState.close();
                  }}
                >
                  <ListItemText primary="Edit song entity" />
                </MenuItem>
              </Menu>
            </Stack>
          </Box>
          <List>
            <ListSubheader
              sx={{ backgroundColor: "background.default" }}
              key="unknownDisc"
            >
              {filesCount} {filesCount < 2 ? "file" : "files"}, {totalMinutes}{" "}
              {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
            </ListSubheader>
            {files.map((v) => (
              <TrackListRow
                key={v.id}
                song={song}
                file={v}
                files={files}
                showAlbum
              />
            ))}
            {song.albums.length > 0 && (
              <>
                <ListSubheader
                  sx={{ backgroundColor: "background.default" }}
                  key="albums"
                >
                  {song.albums.length}{" "}
                  {song.albums.length < 2 ? "album" : "albums"}
                </ListSubheader>
                {song.albums.map((v) => (
                  <Fragment key={v.id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        component={NextComposedLink}
                        href={`/library/albums/${v.id}`}
                      >
                        {!!v.coverUrl && (
                          <ListItemAvatar>
                            <Avatar src={v.coverUrl} variant="rounded" />
                          </ListItemAvatar>
                        )}
                        <ListItemText
                          inset={!v.coverUrl}
                          primary={v.name}
                          secondary={
                            [
                              v.SongInAlbum.diskNumber
                                ? `Disk ${v.SongInAlbum.diskNumber}`
                                : "",
                              v.SongInAlbum.trackNumber
                                ? `Track ${v.SongInAlbum.trackNumber}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(", ") || "Unknown disk"
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    <Divider variant="fullWidth" component="li" />
                  </Fragment>
                ))}
              </>
            )}
          </List>
        </Grid>
      </Grid>
    </Box>
  );
}

LibrarySingleSong.layout = getLayout;
