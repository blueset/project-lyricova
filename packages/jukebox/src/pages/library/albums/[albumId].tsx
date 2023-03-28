import { useRouter } from "next/router";
import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import {
  Avatar,
  Box,
  Chip,
  Grid,
  IconButton,
  List,
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
} from "lyricova-common/utils/fragments";
import Alert from "@mui/material/Alert";
import React, { Fragment } from "react";
import { Album } from "lyricova-common/models/Album";
import _ from "lodash";
import filesize from "filesize";
import { Song } from "lyricova-common/models/Song";
import ButtonRow from "../../../components/ButtonRow";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { formatArtists } from "lyricova-common/frontendUtils/artists";
import Link from "lyricova-common/components/Link";
import { useAuthContext } from "lyricova-common/components/AuthContext";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { MusicFile } from "lyricova-common/models/MusicFile";
import TrackListRow from "../../../components/public/library/TrackListRow";
import { DocumentNode } from "graphql";
import { useAppDispatch } from "../../../redux/public/store";
import {
  loadTracks,
  playTrack,
  toggleShuffle,
} from "../../../redux/public/playlist";

const ALBUM_QUERY = gql`
  query($id: Int!) {
    album(id: $id) {
      files {
        ...MusicFileForPlaylistAttributes
        duration
        fileSize
        songId
      }
      ...FullAlbumEntry
    }
  }

  ${AlbumFragments.FullAlbumEntry}
  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

type ConvertedTrack = Song & {
  foundFile: MusicFile | null;
};

export default function LibrarySingleAlbum() {
  const router = useRouter();
  const { user } = useAuthContext();
  const albumId = parseInt(router.query.albumId as string);
  const popupState = usePopupState({
    variant: "popover",
    popupId: "single-album-overflow-menu",
  });
  const dispatch = useAppDispatch();

  const query = useQuery<{ album: Album }>(ALBUM_QUERY, {
    variables: { id: albumId },
  });

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error)
    return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  const album = query.data.album;
  const trackCount = album.files.length;
  const totalMinutes = Math.round(_.sumBy(album.files, "duration") / 60);
  const totalSize = _.sumBy(album.files, "fileSize");
  const canPlay = trackCount > 0;

  const convertedTracks = _.sortBy(
    album.songs.map(
      (v) =>
        ({
          ...v,
          foundFile: album.files.find((f) => f.songId === v.id) ?? null,
        } as ConvertedTrack)
    ),
    (v) => v.SongInAlbum.diskNumber,
    (v) => v.SongInAlbum.trackNumber
  );

  const diskSeparatedTracked: (ConvertedTrack | number | null)[] = [];

  for (const i of convertedTracks) {
    if (
      diskSeparatedTracked.length < 1 ||
      (diskSeparatedTracked[diskSeparatedTracked.length - 1] as ConvertedTrack)
        .SongInAlbum?.diskNumber != i.SongInAlbum.diskNumber
    ) {
      diskSeparatedTracked.push(i.SongInAlbum.diskNumber);
    }
    diskSeparatedTracked.push(i);
  }

  const playAll = () => {
    dispatch(loadTracks(album.files));
    dispatch(playTrack({ track: 0, playNow: true }));
  };
  const shuffleAll = () => {
    dispatch(loadTracks(album.files));
    dispatch(toggleShuffle());
    dispatch(playTrack({ track: 0, playNow: true }));
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Chip
        label="Albums"
        icon={<ArrowBackIcon />}
        clickable
        size="small"
        sx={{ marginTop: 1, marginBottom: 1 }}
        onClick={() => router.push("/library/albums")}
      />
      <Grid container sx={{ marginTop: 2 }}>
        <Grid item md={4} xs={12}>
          <Box
            sx={{ position: { md: "sticky" }, top: { md: 2 }, marginBottom: 4 }}
          >
            {album.coverUrl && (
              <Avatar
                variant="rounded"
                src={album.coverUrl}
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
            <Typography variant="body2" color="textSecondary">
              {trackCount} {trackCount < 2 ? "song" : "songs"}, {totalMinutes}{" "}
              {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
            </Typography>
          </Box>
        </Grid>
        <Grid item md={8} xs={12}>
          <Box ml={2}>
            <Typography variant="h5">{album.name}</Typography>
            <Typography variant="h6" color="textSecondary">
              {formatArtists(album.artists, (v, isProd) =>
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
                {album.id >= 0 && (
                  <Chip
                    icon={<FindInPageIcon />}
                    label="VocaDB"
                    clickable
                    onClick={() =>
                      window.open(`https://vocadb.net/Al/${album.id}`, "_blank")
                    }
                  />
                )}
              </ButtonRow>
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
                    window.open(`/dashboard/albums/${album.id}`);
                    popupState.close();
                  }}
                >
                  <ListItemText primary="Edit album entity" />
                </MenuItem>
              </Menu>
            </Stack>
          </Box>
          <List>
            {diskSeparatedTracked.map((v, idx) => {
              if (v === null) {
                return (
                  <ListSubheader
                    sx={{ backgroundColor: "background.default" }}
                    key="unknownDisc"
                  >
                    Unknown disc
                  </ListSubheader>
                );
              } else if (typeof v === "number") {
                return (
                  <ListSubheader
                    sx={{ backgroundColor: "background.default" }}
                    key={`disc${v}`}
                  >
                    Disc {v}
                  </ListSubheader>
                );
              } else {
                return (
                  <TrackListRow
                    key={idx}
                    song={v}
                    file={v.foundFile}
                    files={album.files}
                  />
                );
              }
            })}
          </List>
        </Grid>
      </Grid>
    </Box>
  );
}

LibrarySingleAlbum.layout = getLayout;
